package com.aspharier.studytimer

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import com.aspharier.studytimer.data.repository.StudySessionRepository
import com.aspharier.studytimer.di.StudyTimerApp
import com.aspharier.studytimer.domain.model.StudySession
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

enum class PomodoroPhase(val label: String) {
    FOCUS("Focus"),
    SHORT_BREAK("Short Break"),
    LONG_BREAK("Long Break")
}

data class TimerState(
    val sessionId: Long = 0,
    val sessionName: String = "",
    val label: String = "",
    val totalSeconds: Long = 0,
    val remainingSeconds: Long = 0,
    val accumulatedCompletedSeconds: Long = 0,
    val isRunning: Boolean = false,
    val isPaused: Boolean = false,
    val isCompleted: Boolean = false,
    val startedAtMillis: Long = 0,
    val date: String = "",
    val currentPhase: PomodoroPhase = PomodoroPhase.FOCUS,
    val currentCycle: Int = 1,
    val totalCycles: Int = 4,
    val focusMinutes: Int = 25,
    val shortBreakMinutes: Int = 5,
    val longBreakMinutes: Int = 15
)

@AndroidEntryPoint
class TimerService : Service() {

    @Inject
    lateinit var repository: StudySessionRepository

    private val binder = TimerBinder()
    private val serviceJob = SupervisorJob()
    private val scope = CoroutineScope(serviceJob + Dispatchers.Default)
    private var timerJob: Job? = null
    private var persistJob: Job? = null
    private var lastPersistedCompletedSeconds = -1L

    private val _timerState = MutableStateFlow(TimerState())
    val timerState: StateFlow<TimerState> = _timerState.asStateFlow()

    private val _onTimerFinished = MutableStateFlow(false)
    val onTimerFinished: StateFlow<Boolean> = _onTimerFinished.asStateFlow()

    inner class TimerBinder : Binder() {
        fun getService(): TimerService = this@TimerService
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val sessionId = intent.getLongExtra(EXTRA_SESSION_ID, 0L)
                val sessionName = intent.getStringExtra(EXTRA_LABEL) ?: "Study Session"
                val focusMinutes = intent.getIntExtra(EXTRA_FOCUS_DURATION, 25)
                val shortBreakMinutes = intent.getIntExtra(EXTRA_SHORT_BREAK_DURATION, 5)
                val longBreakMinutes = intent.getIntExtra(EXTRA_LONG_BREAK_DURATION, 15)
                val cycles = intent.getIntExtra(EXTRA_CYCLES, 4)
                startTimer(sessionId, sessionName, focusMinutes, shortBreakMinutes, longBreakMinutes, cycles)
            }
            ACTION_PAUSE -> pauseTimer()
            ACTION_RESUME -> resumeTimer()
            ACTION_STOP -> stopTimer()
            ACTION_SKIP_PHASE -> skipPhase()
        }
        return START_STICKY
    }

    private fun startTimer(
        sessionId: Long, 
        sessionName: String,
        focusMinutes: Int, 
        shortBreakMinutes: Int, 
        longBreakMinutes: Int, 
        cycles: Int
    ) {
        val totalSeconds = focusMinutes * 60L
        _timerState.value = TimerState(
            sessionId = sessionId,
            sessionName = sessionName,
            label = PomodoroPhase.FOCUS.label,
            totalSeconds = totalSeconds,
            remainingSeconds = totalSeconds,
            isRunning = true,
            isPaused = false,
            startedAtMillis = System.currentTimeMillis(),
            date = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE),
            currentPhase = PomodoroPhase.FOCUS,
            currentCycle = 1,
            totalCycles = cycles,
            focusMinutes = focusMinutes,
            shortBreakMinutes = shortBreakMinutes,
            longBreakMinutes = longBreakMinutes
        )
        _onTimerFinished.value = false
        lastPersistedCompletedSeconds = -1L
        persistTimerState(isCompleted = false, endTime = null, force = true)
        
        startForegroundWithNotification(
            "${PomodoroPhase.FOCUS.label} (Cycle 1/$cycles)", 
            formatTime(totalSeconds)
        )
        startCountdown()
    }
    
    private fun startForegroundWithNotification(label: String, time: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                createNotification(label, time),
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
        } else {
            startForeground(NOTIFICATION_ID, createNotification(label, time))
        }
    }

    private fun startCountdown() {
        timerJob?.cancel()
        timerJob = scope.launch {
            while (_timerState.value.remainingSeconds > 0 && _timerState.value.isRunning) {
                if (!_timerState.value.isPaused) {
                    delay(1000)
                    _timerState.value = _timerState.value.copy(
                        remainingSeconds = _timerState.value.remainingSeconds - 1
                    )
                    
                    if (_timerState.value.currentPhase == PomodoroPhase.FOCUS) {
                        persistTimerState(isCompleted = false, endTime = null)
                    }
                    
                    val title = "${_timerState.value.currentPhase.label} (Cycle ${_timerState.value.currentCycle}/${_timerState.value.totalCycles})"
                    updateNotification(title, formatTime(_timerState.value.remainingSeconds))
                } else {
                    delay(1000)
                }
            }
            if (_timerState.value.remainingSeconds <= 0) {
                handlePhaseComplete()
            }
        }
    }
    
    private fun skipPhase() {
        if (_timerState.value.isRunning) {
            timerJob?.cancel()
            _timerState.value = _timerState.value.copy(remainingSeconds = 0)
            handlePhaseComplete()
        }
    }

    private fun handlePhaseComplete() {
        vibrateOnPhaseComplete()
        
        val currentState = _timerState.value
        
        if (currentState.currentPhase == PomodoroPhase.FOCUS) {
            val isLastCycle = currentState.currentCycle >= currentState.totalCycles
            persistTimerState(isCompleted = isLastCycle, endTime = if (isLastCycle) System.currentTimeMillis() else null, force = true)
        }

        when (currentState.currentPhase) {
            PomodoroPhase.FOCUS -> {
                if (currentState.currentCycle >= currentState.totalCycles) {
                    startNextPhase(PomodoroPhase.LONG_BREAK)
                } else {
                    startNextPhase(PomodoroPhase.SHORT_BREAK)
                }
            }
            PomodoroPhase.SHORT_BREAK -> {
                val nextCycle = currentState.currentCycle + 1
                _timerState.value = currentState.copy(currentCycle = nextCycle)
                startNextPhase(PomodoroPhase.FOCUS)
            }
            PomodoroPhase.LONG_BREAK -> {
                onTimerComplete()
            }
        }
    }
    
    private fun startNextPhase(phase: PomodoroPhase) {
        val currentState = _timerState.value
        val totalSeconds = when (phase) {
            PomodoroPhase.FOCUS -> currentState.focusMinutes * 60L
            PomodoroPhase.SHORT_BREAK -> currentState.shortBreakMinutes * 60L
            PomodoroPhase.LONG_BREAK -> currentState.longBreakMinutes * 60L
        }
        
        val newAccumulated = if (currentState.currentPhase == PomodoroPhase.FOCUS) {
            currentState.accumulatedCompletedSeconds + currentState.focusMinutes * 60L
        } else {
            currentState.accumulatedCompletedSeconds
        }
        
        _timerState.value = currentState.copy(
            accumulatedCompletedSeconds = newAccumulated,
            currentPhase = phase,
            label = phase.label,
            totalSeconds = totalSeconds,
            remainingSeconds = totalSeconds,
            isPaused = false
        )
        
        val title = "${phase.label} (Cycle ${_timerState.value.currentCycle}/${_timerState.value.totalCycles})"
        updateNotification(title, formatTime(totalSeconds))
        startCountdown()
    }

    private fun vibrateOnPhaseComplete() {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        
        if (vibrator.hasVibrator()) {
            val pattern = longArrayOf(0, 500, 200, 500)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(pattern, -1)
            }
        }
    }

    private fun pauseTimer() {
        _timerState.value = _timerState.value.copy(isPaused = true)
        if (_timerState.value.currentPhase == PomodoroPhase.FOCUS) {
            persistTimerState(isCompleted = false, endTime = null, force = true)
        }
        val title = "${_timerState.value.currentPhase.label} (Paused)"
        updateNotification(title, formatTime(_timerState.value.remainingSeconds))
    }

    private fun resumeTimer() {
        _timerState.value = _timerState.value.copy(isPaused = false)
        if (_timerState.value.currentPhase == PomodoroPhase.FOCUS) {
            persistTimerState(isCompleted = false, endTime = null, force = true)
        }
    }

    private fun stopTimer() {
        if (_timerState.value.currentPhase == PomodoroPhase.FOCUS) {
            persistTimerState(isCompleted = false, endTime = System.currentTimeMillis(), force = true)
        }
        timerJob?.cancel()
        _timerState.value = TimerState()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun onTimerComplete() {
        timerJob?.cancel()
        _timerState.value = _timerState.value.copy(
            isRunning = false,
            isCompleted = true
        )
        persistTimerState(isCompleted = true, endTime = System.currentTimeMillis(), force = true)
        _onTimerFinished.value = true
        showFinishedNotification()
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    private fun createNotification(title: String, time: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, StudyTimerApp.TIMER_CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(time)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun updateNotification(title: String, time: String) {
        val notification = createNotification(title, time)
        val notificationManager = getSystemService(android.app.NotificationManager::class.java)
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun showFinishedNotification() {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, StudyTimerApp.FINISHED_CHANNEL_ID)
            .setContentTitle("Pomodoro Complete!")
            .setContentText("You have finished all cycles.")
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        val notificationManager = getSystemService(android.app.NotificationManager::class.java)
        notificationManager.notify(FINISHED_NOTIFICATION_ID, notification)
    }

    private fun formatTime(seconds: Long): String {
        val mins = seconds / 60
        val secs = seconds % 60
        return String.format("%02d:%02d", mins, secs)
    }

    private fun persistTimerState(isCompleted: Boolean, endTime: Long?, force: Boolean = false) {
        val state = _timerState.value
        if (state.sessionId == 0L) return
        
        val currentFocusCompleted = if (state.currentPhase == PomodoroPhase.FOCUS) {
             state.totalSeconds - state.remainingSeconds
        } else 0L
        
        val totalCompletedSeconds = state.accumulatedCompletedSeconds + currentFocusCompleted
        
        if (totalCompletedSeconds == 0L && !isCompleted) return
        
        if (!force && totalCompletedSeconds - lastPersistedCompletedSeconds < PERSIST_INTERVAL_SECONDS) {
            return
        }
        lastPersistedCompletedSeconds = totalCompletedSeconds

        persistJob?.cancel()
        persistJob = scope.launch(Dispatchers.IO) {
            val totalDurationMins = state.focusMinutes * state.totalCycles
            repository.updateSession(
                StudySession(
                    id = state.sessionId,
                    label = state.sessionName,
                    durationMinutes = totalDurationMins,
                    completedDurationSeconds = totalCompletedSeconds,
                    date = state.date,
                    startTime = state.startedAtMillis,
                    endTime = endTime ?: state.startedAtMillis + (totalCompletedSeconds * 1000),
                    isCompleted = isCompleted
                )
            )
        }
    }

    override fun onDestroy() {
        timerJob?.cancel()
        val activePersistJob = persistJob
        if (activePersistJob?.isActive == true) {
            activePersistJob.invokeOnCompletion { serviceJob.cancel() }
        } else {
            serviceJob.cancel()
        }
        super.onDestroy()
    }

    companion object {
        const val ACTION_START = "com.aspharier.studytimer.ACTION_START"
        const val ACTION_PAUSE = "com.aspharier.studytimer.ACTION_PAUSE"
        const val ACTION_RESUME = "com.aspharier.studytimer.ACTION_RESUME"
        const val ACTION_STOP = "com.aspharier.studytimer.ACTION_STOP"
        const val ACTION_SKIP_PHASE = "com.aspharier.studytimer.ACTION_SKIP_PHASE"

        const val EXTRA_SESSION_ID = "extra_session_id"
        const val EXTRA_FOCUS_DURATION = "extra_focus_duration"
        const val EXTRA_SHORT_BREAK_DURATION = "extra_short_break_duration"
        const val EXTRA_LONG_BREAK_DURATION = "extra_long_break_duration"
        const val EXTRA_CYCLES = "extra_cycles"
        const val EXTRA_LABEL = "extra_label" // legacy

        private const val NOTIFICATION_ID = 1
        private const val FINISHED_NOTIFICATION_ID = 2
        private const val PERSIST_INTERVAL_SECONDS = 5L
    }
}
