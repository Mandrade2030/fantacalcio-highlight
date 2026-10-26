package it.ciempionsfig.app;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;

/** Ogni ora (dalle 8 alle 23, ora di Roma) controlla fantacalcio e carica i dati sul server, anche ad app chiusa. */
public class FantaJob extends JobService {
    static final int ID = 4711;

    static void programma(Context c) {
        JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js == null) return;
        for (JobInfo j : js.getAllPendingJobs()) if (j.getId() == ID) return;
        js.schedule(new JobInfo.Builder(ID, new ComponentName(c, FantaJob.class))
                .setPeriodic(60 * 60 * 1000L)
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPersisted(true)
                .build());
    }

    @Override
    public boolean onStartJob(JobParameters params) {
        if (!FantaSync.haChiave(this) || !FantaSync.oraGiusta()) return false;
        new Thread(() -> {
            FantaSync.esegui(this);
            jobFinished(params, false);
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return false;
    }
}
