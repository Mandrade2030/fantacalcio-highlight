package it.ciempionsfig.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * App "Ciempions Fig": apre l'app web di Fanta Highlights (server di Davide) a tutto schermo.
 * - L'indirizzo del server si legge da server-url.txt su GitHub (così se cambia il tunnel l'app si aggiorna da sola),
 *   altrimenti si usa l'ultimo salvato o si chiede a mano.
 * - "Scarica" su video e immagini: il file va in Download e si apre il menu Condividi (WhatsApp, ecc.).
 */
public class MainActivity extends Activity {
    private static final String URL_INDIRIZZO =
            "https://raw.githubusercontent.com/Mandrade2030/fantacalcio-highlight/main/server-url.txt";
    private static final String DEFAULT = "https://equity-foo-celebrities-tion.trycloudflare.com";
    private static final int SCEGLI_FILE = 7;

    private WebView web;
    private SharedPreferences pref;
    private ValueCallback<Uri[]> fileCallback;
    private final Handler ui = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        pref = getSharedPreferences("app", MODE_PRIVATE);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#06070D"));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setUserAgentString(s.getUserAgentString() + " CiempionsFigApp/1");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                String server = Uri.parse(serverAttuale()).getHost();
                if (u.getHost() != null && u.getHost().equals(server)) {
                    // video e immagini generati: scarica + condividi invece di aprirli nella WebView
                    String p = u.getPath() == null ? "" : u.getPath().toLowerCase();
                    if (p.startsWith("/out/") && (p.endsWith(".mp4") || p.endsWith(".png") || p.endsWith(".jpg"))) {
                        scarica(u.toString(), web.getSettings().getUserAgentString(), null, p.endsWith(".mp4") ? "video/mp4" : "image/png");
                        return true;
                    }
                    return false;
                }
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) chiediIndirizzo("Il server non risponde. Controlla l'indirizzo:");
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                CookieManager.getInstance().flush();
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                try {
                    startActivityForResult(p.createIntent(), SCEGLI_FILE);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        web.setDownloadListener((url, ua, disp, mime, len) -> scarica(url, ua, disp, mime));

        // all'avvio cerca l'indirizzo aggiornato del server (se il tunnel è cambiato)
        new Thread(() -> {
            String nuovo = leggiIndirizzoOnline();
            ui.post(() -> {
                if (nuovo != null) pref.edit().putString("server", nuovo).apply();
                web.loadUrl(serverAttuale());
            });
        }).start();
    }

    private String serverAttuale() {
        return pref.getString("server", DEFAULT);
    }

    private String leggiIndirizzoOnline() {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(URL_INDIRIZZO + "?t=" + System.currentTimeMillis()).openConnection();
            c.setConnectTimeout(4000);
            c.setReadTimeout(4000);
            c.setUseCaches(false);
            if (c.getResponseCode() != 200) return null;
            BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream()));
            String l = r.readLine();
            r.close();
            if (l != null && l.trim().startsWith("http")) return l.trim().replaceAll("/+$", "");
        } catch (Exception ignored) {}
        return null;
    }

    private void chiediIndirizzo(String titolo) {
        if (isFinishing()) return;
        EditText in = new EditText(this);
        in.setText(serverAttuale());
        in.setSingleLine(true);
        new AlertDialog.Builder(this)
                .setTitle(titolo)
                .setView(in)
                .setPositiveButton("Apri", (d, w) -> {
                    String v = in.getText().toString().trim().replaceAll("/+$", "");
                    if (!v.startsWith("http")) v = "https://" + v;
                    pref.edit().putString("server", v).apply();
                    web.loadUrl(v);
                })
                .setNeutralButton("Riprova", (d, w) -> new Thread(() -> {
                    String nuovo = leggiIndirizzoOnline();
                    ui.post(() -> {
                        if (nuovo != null) pref.edit().putString("server", nuovo).apply();
                        web.loadUrl(serverAttuale());
                    });
                }).start())
                .setCancelable(false)
                .show();
    }

    /** Scarica con i cookie della sessione, salva in Download e apre "Condividi" */
    private void scarica(String url, String ua, String disp, String mime) {
        String nome = URLUtil.guessFileName(url, disp, mime);
        if (nome.contains("?")) nome = nome.substring(0, nome.indexOf('?'));
        final String nomeFile = nome;
        Toast.makeText(this, "Scarico " + nomeFile + "…", Toast.LENGTH_SHORT).show();
        String cookie = CookieManager.getInstance().getCookie(url);
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                if (cookie != null) c.setRequestProperty("Cookie", cookie);
                c.setRequestProperty("User-Agent", ua);
                String tipo = c.getContentType() != null ? c.getContentType().split(";")[0] : mime;
                File dir = new File(getCacheDir(), "condivisi");
                dir.mkdirs();
                File f = new File(dir, nomeFile);
                try (InputStream is = c.getInputStream(); OutputStream os = new FileOutputStream(f)) {
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = is.read(buf)) > 0) os.write(buf, 0, n);
                }
                salvaInDownload(f, nomeFile, tipo);
                Uri uri = FileProvider.getUriForFile(this, "it.ciempionsfig.app.files", f);
                Intent share = new Intent(Intent.ACTION_SEND);
                share.setType(tipo != null ? tipo : "*/*");
                share.putExtra(Intent.EXTRA_STREAM, uri);
                share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                ui.post(() -> {
                    Toast.makeText(this, "Salvato in Download", Toast.LENGTH_SHORT).show();
                    startActivity(Intent.createChooser(share, "Manda " + nomeFile));
                });
            } catch (Exception e) {
                ui.post(() -> Toast.makeText(this, "Download non riuscito: " + e.getMessage(), Toast.LENGTH_LONG).show());
            }
        }).start();
    }

    private void salvaInDownload(File f, String nome, String tipo) {
        if (Build.VERSION.SDK_INT < 29) return;
        try {
            ContentValues v = new ContentValues();
            v.put(MediaStore.Downloads.DISPLAY_NAME, nome);
            v.put(MediaStore.Downloads.MIME_TYPE, tipo);
            v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Ciempions Fig");
            Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (u == null) return;
            try (OutputStream os = getContentResolver().openOutputStream(u); InputStream is = new java.io.FileInputStream(f)) {
                byte[] buf = new byte[65536];
                int n;
                while ((n = is.read(buf)) > 0) os.write(buf, 0, n);
            }
        } catch (Exception ignored) {}
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == SCEGLI_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            fileCallback = null;
            return;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }
}
