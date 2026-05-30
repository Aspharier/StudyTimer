package com.aspharier.studytimer.ui.screens.timer

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Brightness2
import androidx.compose.material.icons.filled.Brightness4
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
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
    val haptic = LocalHapticFeedback.current
    var timerState by remember { mutableStateOf(TimerState()) }
    var isBound by remember { mutableStateOf(false) }
    var dimMode by rememberSaveable { mutableStateOf(false) }

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

    // Keep screen on or dim it
    DisposableEffect(dimMode) {
        val window = (context as? ComponentActivity)?.window
        if (dimMode) {
            window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            val params = window?.attributes
            params?.screenBrightness = 0.01f // very dim
            window?.attributes = params
        } else {
            window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            val params = window?.attributes
            params?.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
            window?.attributes = params
        }
        onDispose {
            window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            val params = window?.attributes
            params?.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
            window?.attributes = params
        }
    }
    
    DisposableEffect(Unit) {
        onDispose {
            try {
                context.unbindService(connection)
            } catch (e: Exception) { }
        }
    }

    val savedSessionState = uiState.session?.let { session ->
        val totalSeconds = session.durationMinutes * 60L
        TimerState(
            sessionId = session.id,
            sessionName = session.label,
            label = "Completed",
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

    val animatedProgress by animateFloatAsState(
        targetValue = if (displayState.totalSeconds > 0) 
            (displayState.remainingSeconds.toFloat() / displayState.totalSeconds.toFloat()) 
            else 1f,
        animationSpec = tween(durationMillis = 1000, easing = LinearEasing),
        label = "progress"
    )

    val backgroundColor by animateColorAsState(
        targetValue = if (dimMode) Color.Black else MaterialTheme.colorScheme.background,
        animationSpec = tween(500),
        label = "bgColor"
    )
    
    val contentColor = if (dimMode) Color.DarkGray else MaterialTheme.colorScheme.onBackground

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(backgroundColor)
    ) {
        // Top Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { 
                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onNavigateBack() 
            }) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Close",
                    tint = contentColor
                )
            }
            
            IconButton(onClick = { 
                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                dimMode = !dimMode 
            }) {
                Icon(
                    imageVector = if (dimMode) Icons.Default.Brightness4 else Icons.Default.Brightness2,
                    contentDescription = "Toggle Dim Mode",
                    tint = contentColor
                )
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Cycle Info
            AnimatedVisibility(!dimMode) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "Cycle ${displayState.currentCycle} of ${displayState.totalCycles}",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }

            Text(
                text = displayState.sessionName.ifBlank { "Study Session" },
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = contentColor
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = displayState.label.ifBlank { "Focus" },
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(48.dp))

            // Timer Ring
            Box(
                modifier = Modifier.size(280.dp),
                contentAlignment = Alignment.Center
            ) {
                val ringColor = if (dimMode) Color.DarkGray.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surfaceVariant
                val progressColor = if (dimMode) Color.Gray else MaterialTheme.colorScheme.primary
                
                Canvas(modifier = Modifier.fillMaxSize()) {
                    drawArc(
                        color = ringColor,
                        startAngle = -90f,
                        sweepAngle = 360f,
                        useCenter = false,
                        style = Stroke(width = 12.dp.toPx(), cap = StrokeCap.Round)
                    )
                    drawArc(
                        color = progressColor,
                        startAngle = -90f,
                        sweepAngle = 360f * animatedProgress,
                        useCenter = false,
                        style = Stroke(width = 12.dp.toPx(), cap = StrokeCap.Round)
                    )
                }
                
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = formatClock(displayState.remainingSeconds),
                        fontSize = 56.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.sp,
                        color = contentColor
                    )
                    
                    if (displayState.isPaused && !dimMode) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "PAUSED",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.error,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(64.dp))

            // Controls
            if (!dimMode) {
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (!isViewingActiveTimer || displayState.isCompleted || (!displayState.isRunning && !displayState.isPaused)) {
                        Text(
                            text = if (displayState.isCompleted) "Session Complete" else "Not running",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        // Stop
                        IconButton(
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                val intent = Intent(context, TimerService::class.java).apply {
                                    action = TimerService.ACTION_STOP
                                }
                                context.startService(intent)
                                onNavigateBack()
                            },
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Stop,
                                contentDescription = "Stop",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        
                        Spacer(modifier = Modifier.width(32.dp))

                        // Play/Pause
                        Button(
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
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
                                containerColor = MaterialTheme.colorScheme.primary,
                                contentColor = MaterialTheme.colorScheme.onPrimary
                            ),
                            modifier = Modifier.size(80.dp),
                            shape = CircleShape
                        ) {
                            Icon(
                                imageVector = if (displayState.isPaused) Icons.Default.PlayArrow else Icons.Default.Pause,
                                contentDescription = if (displayState.isPaused) "Resume" else "Pause",
                                modifier = Modifier.size(36.dp)
                            )
                        }
                        
                        Spacer(modifier = Modifier.width(32.dp))
                        
                        // Skip
                        IconButton(
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                val intent = Intent(context, TimerService::class.java).apply {
                                    action = TimerService.ACTION_SKIP_PHASE
                                }
                                context.startService(intent)
                            },
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Icon(
                                imageVector = Icons.Default.SkipNext,
                                contentDescription = "Skip Phase",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                }
            } else {
                Text(
                    text = "Tap moon icon to exit dim mode",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.DarkGray
                )
            }
        }
    }
}

private fun formatClock(seconds: Long): String {
    val safeSeconds = seconds.coerceAtLeast(0)
    val minutes = safeSeconds / 60
    val remainingSeconds = safeSeconds % 60
    return "%02d:%02d".format(minutes, remainingSeconds)
}
