package it.ciempionsfig.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import android.webkit.CookieManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Scarica da leghe.fantacalcio.it (con la chiave di lega di Davide, salvata solo su questo telefono)
 * calendario, giocatori e formazioni, e li carica sul server, che li trasforma in giornate/formazioni.
 * Serve perché il server (AWS) viene bloccato da fantacalcio con un 403; il telefono no.
 */
public class FantaSync {
    static final String API = "https://apileague.fantacalcio.it";
    static final int COMPETIZIONE = 645622;

    /** Legge il "codice" (base64 di {a,t}) e lo salva. Lancia un'eccezione col motivo se non va. */
    static void salvaChiave(Context c, String codice) throws Exception {
        String t = codice == null ? "" : codice.trim();
        JSONObject j;
        try {
            j = new JSONObject(t.startsWith("{") ? t : new String(Base64.decode(t, Base64.DEFAULT), StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new Exception("Codice non valido: copialo di nuovo dalla pagina di fantacalcio.");
        }
        String a = j.optString("a", j.optString("app_key", ""));
        String tok = j.optString("t", j.optString("Authorization", ""));
        if (a.isEmpty() || tok.isEmpty()) throw new Exception("Codice incompleto: rifai la procedura sulla pagina della lega.");
        if (!tok.toLowerCase(Locale.ROOT).startsWith("bearer ")) tok = "Bearer " + tok;
        c.getSharedPreferences("app", Context.MODE_PRIVATE).edit().putString("fk_a", a).putString("fk_t", tok).apply();
    }

    static boolean haChiave(Context c) {
        SharedPreferences p = c.getSharedPreferences("app", Context.MODE_PRIVATE);
        return !p.getString("fk_a", "").isEmpty() && !p.getString("fk_t", "").isEmpty();
    }

    static String stato(Context c) {
        SharedPreferences p = c.getSharedPreferences("app", Context.MODE_PRIVATE);
        try {
            return new JSONObject().put("chiave", haChiave(c)).put("esito", p.getString("fk_esito", "")).put("quando", p.getLong("fk_quando", 0)).toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    static boolean oraGiusta() {
        java.util.Calendar cal = java.util.Calendar.getInstance(TimeZone.getTimeZone("Europe/Rome"));
        int h = cal.get(java.util.Calendar.HOUR_OF_DAY);
        return h >= 8 && h <= 23;
    }

    private static String leggi(HttpURLConnection c) throws Exception {
        InputStream is = c.getResponseCode() >= 400 ? c.getErrorStream() : c.getInputStream();
        if (is == null) return "";
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        byte[] b = new byte[16384];
        int n;
        while ((n = is.read(b)) > 0) o.write(b, 0, n);
        is.close();
        return o.toString("UTF-8");
    }

    private static String fanta(SharedPreferences p, String path) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(API + path).openConnection();
        c.setConnectTimeout(20000);
        c.setReadTimeout(30000);
        c.setRequestProperty("app_key", p.getString("fk_a", ""));
        c.setRequestProperty("Authorization", p.getString("fk_t", ""));
        c.setRequestProperty("Accept", "application/json");
        int code = c.getResponseCode();
        String corpo = leggi(c);
        if (code == 401) throw new Exception("Fantacalcio ha rifiutato la chiave (401): rifai il codice dalla pagina della lega.");
        if (code == 403) throw new Exception("Fantacalcio risponde 403 anche dal telefono.");
        if (code >= 400) throw new Exception("Fantacalcio: errore " + code + " su " + path);
        return corpo;
    }

    private static String cookie(SharedPreferences p, String server) {
        String ck = null;
        try { ck = CookieManager.getInstance().getCookie(server); } catch (Exception ignored) {}
        if (ck == null || ck.isEmpty()) ck = p.getString("cookie", "");
        return ck;
    }

    /** Esegue tutto e ritorna una frase con l'esito (salvata anche nelle preferenze). */
    static synchronized String esegui(Context c) {
        SharedPreferences p = c.getSharedPreferences("app", Context.MODE_PRIVATE);
        String esito;
        try {
            if (!haChiave(c)) throw new Exception("Chiave non ancora inserita.");
            String server = p.getString("server", "");
            if (server.isEmpty()) throw new Exception("Apri prima l'app per collegarla al server.");
            String ck = cookie(p, server);

            String calTxt = fanta(p, "/onboarding/v1/league/competition/calendar/" + COMPETIZIONE);
            JSONArray cal = new JSONArray(calTxt);
            List<Integer> calcolate = new ArrayList<>();
            StringBuilder lista = new StringBuilder();
            for (int i = 0; i < cal.length(); i++) {
                JSONObject g = cal.getJSONObject(i);
                if (!g.optBoolean("calculated")) break;
                calcolate.add(g.getInt("matchDay"));
                if (lista.length() > 0) lista.append(',');
                lista.append(g.getInt("matchDay"));
            }
            JSONObject dati = new JSONObject();
            dati.put("/onboarding/v1/league/competition/calendar/" + COMPETIZIONE, cal);
            dati.put("/onboarding/v1/league/players", new JSONObject(fanta(p, "/onboarding/v1/league/players")));

            String r = chiamaServer(server, "/api/fantacalcio/mancanti?calcolate=" + lista, null, ck);
            JSONArray giornate = new JSONObject(r).optJSONArray("giornate");
            int ultima = calcolate.isEmpty() ? 0 : calcolate.get(calcolate.size() - 1);
            for (int k = 0; giornate != null && k < giornate.length(); k++) {
                int n = giornate.getInt(k);
                JSONObject g = null;
                for (int i = 0; i < cal.length(); i++) if (cal.getJSONObject(i).getInt("matchDay") == n) g = cal.getJSONObject(i);
                if (g == null) continue;
                String path = "/gaming/v1/teamLineup/" + COMPETIZIONE + "/" + n + "/" + g.getInt("championshipMatchDay");
                try {
                    dati.put(path, new JSONArray(fanta(p, path)));
                } catch (Exception e) {
                    if (n <= ultima) throw e; // la prossima giornata può non avere ancora formazioni
                }
            }
            String ris = chiamaServer(server, "/api/fantacalcio/dati", dati.toString(), ck);
            JSONObject o = new JSONObject(ris);
            JSONArray nu = o.optJSONArray("nuove"), ag = o.optJSONArray("aggiornate");
            esito = "ok · calcolate fino alla " + ultima
                    + ((nu != null && nu.length() > 0) ? " · nuove: " + nu.join(", ") : " · nessuna giornata nuova")
                    + ((ag != null && ag.length() > 0) ? " · aggiornate: " + ag.join(", ") : "")
                    + (o.isNull("formazioniSalvate") ? "" : " · formazioni " + o.optInt("formazioniSalvate"));
        } catch (Exception e) {
            esito = "errore · " + e.getMessage();
        }
        p.edit().putString("fk_esito", esito).putLong("fk_quando", System.currentTimeMillis()).apply();
        return esito;
    }

    private static String chiamaServer(String server, String path, String body, String cookie) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(server + path).openConnection();
        c.setConnectTimeout(20000);
        c.setReadTimeout(120000);
        if (cookie != null && !cookie.isEmpty()) c.setRequestProperty("Cookie", cookie);
        c.setInstanceFollowRedirects(false);
        if (body != null) {
            c.setRequestMethod("POST");
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type", "application/json");
            try (OutputStream os = c.getOutputStream()) { os.write(body.getBytes(StandardCharsets.UTF_8)); }
        }
        int code = c.getResponseCode();
        String t = leggi(c);
        if (code == 401 || code == 302) throw new Exception("Il server chiede la password: apri l'app Ciempions Fig e accedi una volta.");
        if (code >= 400) {
            String m = t;
            try { m = new JSONObject(t).optString("errore", t); } catch (Exception ignored) {}
            throw new Exception("Server: " + (m.length() > 200 ? m.substring(0, 200) : m));
        }
        return t;
    }
}
