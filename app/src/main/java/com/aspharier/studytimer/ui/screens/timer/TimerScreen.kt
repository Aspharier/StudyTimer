package com.aspharier.studytimer.ui.screens.timer

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aspharier.studytimer.TimerService
import com.aspharier.studytimer.TimerState
import kotlinx.coroutines.flow.collectLatest

@Composable
fun TimerScreen(
    sessionId: Long,
    onNavigateBack: () -> Unit,
    viewModel: TimerViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var timerState by remember { mutableStateOf(TimerState()) }
    var isBound by remember { mutableStateOf(false) }

    val uiState by viewModel.uiState.collectAsState()

    val timerService = remember {
        object {
            var service: TimerService? = null
        }
    }

    val connection = remember {
        object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
                val binder = service as TimerService.TimerBinder
                timerService.service = binder.getService()
                isBound = true
            }

            override fun onServiceDisconnected(name: ComponentName?) {
                timerService.service = null
                isBound = false
            }
        }
    }

    LaunchedEffect(sessionId) {
        viewModel.loadSession(sessionId)
        Intent(context, TimerService::class.java).also { intent ->
            context.bindService(intent, connection, Context.BIND_AUTO_CREATE)
        }
    }

    LaunchedEffect(isBound) {
        if (isBound) {
            timerService.service?.timerState?.collectLatest { state ->
                timerState = state
            }
        }
    }

    // Keep screen on while this timer screen is displayed
    DisposableEffect(Unit) {
        val window = (context as? ComponentActivity)?.window
        window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose {
            window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            try {
                context.unbindService(connection)
            } catch (e: Exception) { }
        }
    }

    val savedSessionState = uiState.session?.let { session ->
        val totalSeconds = session.durationMinutes * 60L
        TimerState(
            sessionId = session.id,
            label = session.label,
            totalSeconds = totalSeconds,
            remainingSeconds = (totalSeconds - session.completedDurationSeconds).coerceAtLeast(0L),
            isRunning = false,
            isPaused = false,
            isCompleted = session.isCompleted,
            startedAtMillis = session.startTime,
            date = session.date
        )
    }
    val displayState = if (timerState.sessionId == sessionId && timerState.totalSeconds > 0) {
        timerState
    } else {
        savedSessionState ?: timerState
    }
    val isViewingActiveTimer = timerState.sessionId == sessionId && timerState.totalSeconds > 0


    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = displayState.label.ifBlank { "Study Session" },
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(modifier = Modifier.height(40.dp))

            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = formatClock(displayState.remainingSeconds),
                    fontSize = 72.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 4.sp,
                    color = MaterialTheme.colorScheme.onBackground
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "hours   minutes   seconds",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                AnimatedVisibility(
                    visible = displayState.isPaused,
                    enter = fadeIn(),
                    exit = fadeOut()
                ) {
                    Text(
                        text = "PAUSED",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            val targetMinutes = displayState.totalSeconds / 60
            val currentMinutes = (displayState.totalSeconds - displayState.remainingSeconds) / 60

            Text(
                text = "$currentMinutes / $targetMinutes min",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(48.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                if (!isViewingActiveTimer || displayState.isCompleted || !displayState.isRunning) {
                    Text(
                        text = if (displayState.isCompleted) "Completed" else "Not running",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    Button(
                        onClick = {
                            if (displayState.isPaused) {
                                val intent = Intent(context, TimerService::class.java).apply {
                                    action = TimerService.ACTION_RESUME
                                }
                                context.startService(intent)
                            } else {
                                val intent = Intent(context, TimerService::class.java).apply {
                                    action = TimerService.ACTION_PAUSE
                                }
                                context.startService(intent)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant,
                            contentColor = MaterialTheme.colorScheme.onSurface
                        ),
                        modifier = Modifier.size(72.dp),
                        shape = CircleShape
                    ) {
                        Icon(
                            imageVector = if (displayState.isPaused) Icons.Default.PlayArrow else Icons.Default.Pause,
                            contentDescription = if (displayState.isPaused) "Resume" else "Pause",
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    Button(
                        onClick = {
                            val intent = Intent(context, TimerService::class.java).apply {
                                action = TimerService.ACTION_STOP
                            }
                            context.startService(intent)
                            onNavigateBack()
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error,
                            contentColor = MaterialTheme.colorScheme.onError
                        ),
                        modifier = Modifier.size(72.dp),
                        shape = CircleShape
                    ) {
                        Icon(
                            imageVector = Icons.Default.Stop,
                            contentDescription = "Stop",
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
            }
        }

        TextButton(
            onClick = onNavigateBack,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 32.dp)
        ) {
            Text(
                text = "Exit to History",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

private fun formatClock(seconds: Long): String {
    val safeSeconds = seconds.coerceAtLeast(0)
    val hours = safeSeconds / 3600
    val minutes = (safeSeconds % 3600) / 60
    val remainingSeconds = safeSeconds % 60
    return "%02d:%02d:%02d".format(hours, minutes, remainingSeconds)
}
