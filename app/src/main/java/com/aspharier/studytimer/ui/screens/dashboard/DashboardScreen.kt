package com.aspharier.studytimer.ui.screens.dashboard

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.automirrored.filled.TrendingFlat
import androidx.compose.material.icons.automirrored.filled.TrendingDown
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aspharier.studytimer.domain.model.Subject
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import kotlin.math.roundToInt

import androidx.compose.material.icons.filled.Palette
import com.aspharier.studytimer.ui.theme.AppTheme

@Composable
fun DashboardScreen(
    selectedTheme: AppTheme,
    onThemeSelected: (AppTheme) -> Unit,
    onProfileClick: () -> Unit,
    onStartSession: (Long?, String?) -> Unit,
    onSetExamGoal: () -> Unit,
    onSyllabusClick: () -> Unit,
    onMockTestClick: () -> Unit,
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val haptic = LocalHapticFeedback.current
    val uiState by viewModel.uiState.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(top = 24.dp, bottom = 48.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // Header
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Focusly",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    var isThemeDropdownExpanded by remember { mutableStateOf(false) }
                    Box {
                        IconButton(
                            onClick = { isThemeDropdownExpanded = true },
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Palette,
                                contentDescription = "Theme",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        DropdownMenu(
                            expanded = isThemeDropdownExpanded,
                            onDismissRequest = { isThemeDropdownExpanded = false },
                            modifier = Modifier.background(MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            AppTheme.entries.forEach { theme ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            text = theme.title,
                                            color = MaterialTheme.colorScheme.onSurface,
                                            fontWeight = if (theme == selectedTheme) FontWeight.Bold else FontWeight.Normal
                                        )
                                    },
                                    onClick = {
                                        onThemeSelected(theme)
                                        isThemeDropdownExpanded = false
                                    },
                                    leadingIcon = {
                                        Box(
                                            modifier = Modifier
                                                .size(24.dp)
                                                .clip(CircleShape)
                                                .background(theme.previewColor)
                                        )
                                    }
                                )
                            }
                        }
                    }

                    IconButton(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            onProfileClick()
                        },
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = "Profile",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

        // Exam Countdown Card
        item {
            val examGoal = uiState.activeExamGoal
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    if (examGoal != null) {
                        val daysRemaining = remember(examGoal.examDate) {
                            try {
                                val target = LocalDate.parse(examGoal.examDate, DateTimeFormatter.ISO_LOCAL_DATE)
                                ChronoUnit.DAYS.between(LocalDate.now(), target).coerceAtLeast(0L)
                            } catch (_: Exception) {
                                0L
                            }
                        }

                        Text(
                            text = examGoal.name,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = "$daysRemaining",
                            style = MaterialTheme.typography.displayLarge.copy(fontSize = 64.sp),
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                            textAlign = TextAlign.Center
                        )

                        Text(
                            text = "days remaining",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(IntrinsicSize.Min),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Button(
                                onClick = {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    onSetExamGoal()
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight(),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp)
                            ) {
                                Text(
                                    text = "Manage Goals",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    textAlign = TextAlign.Center,
                                    style = MaterialTheme.typography.labelMedium
                                )
                            }

                            Button(
                                onClick = {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    onMockTestClick()
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight(),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp)
                            ) {
                                Text(
                                    text = "Mock Tests & Analytics",
                                    color = MaterialTheme.colorScheme.primary,
                                    textAlign = TextAlign.Center,
                                    style = MaterialTheme.typography.labelMedium
                                )
                            }
                        }
                    } else {
                        Text(
                            text = "No active exam goal set",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                onSetExamGoal()
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary
                            ),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Set Your Exam Goal", color = MaterialTheme.colorScheme.onPrimary)
                        }
                    }
                }
            }
        }

        // Today's Progress Ring & Streak Info
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Circular Progress Ring Box
                Box(
                    modifier = Modifier
                        .size(160.dp)
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    val dailyTargetSeconds = uiState.adaptiveTargetMinutes * 60L
                    val studiedSeconds = uiState.todayStudiedSeconds
                    val totalProgress = if (dailyTargetSeconds > 0) {
                        studiedSeconds.toFloat() / dailyTargetSeconds
                    } else 0f

                    val innerProgress = totalProgress.coerceAtMost(1f)
                    val outerProgress = if (totalProgress > 1f) (totalProgress - 1f).coerceAtMost(1f) else 0f

                    val innerAnimatedProgress by animateFloatAsState(
                        targetValue = innerProgress,
                        animationSpec = tween(durationMillis = 1000),
                        label = "inner_progress"
                    )
                    val outerAnimatedProgress by animateFloatAsState(
                        targetValue = outerProgress,
                        animationSpec = tween(durationMillis = 1000),
                        label = "outer_progress"
                    )

                    val dashEffect = remember { PathEffect.dashPathEffect(floatArrayOf(15f, 10f), 0f) }
                    val ringColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    val innerColor = MaterialTheme.colorScheme.primary
                    val outerColor = Color(0xFFF59E0B) // Amber gold

                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val canvasWidth = size.width
                        val canvasHeight = size.height

                        // Inner ring track (inset by 24dp)
                        drawArc(
                            color = ringColor,
                            startAngle = -90f,
                            sweepAngle = 360f,
                            useCenter = false,
                            style = Stroke(width = 8.dp.toPx(), cap = StrokeCap.Round, pathEffect = dashEffect),
                            topLeft = androidx.compose.ui.geometry.Offset(24.dp.toPx(), 24.dp.toPx()),
                            size = androidx.compose.ui.geometry.Size(canvasWidth - 48.dp.toPx(), canvasHeight - 48.dp.toPx())
                        )

                        // Inner ring progress
                        drawArc(
                            color = innerColor,
                            startAngle = -90f,
                            sweepAngle = 360f * innerAnimatedProgress,
                            useCenter = false,
                            style = Stroke(width = 8.dp.toPx(), cap = StrokeCap.Round, pathEffect = dashEffect),
                            topLeft = androidx.compose.ui.geometry.Offset(24.dp.toPx(), 24.dp.toPx()),
                            size = androidx.compose.ui.geometry.Size(canvasWidth - 48.dp.toPx(), canvasHeight - 48.dp.toPx())
                        )

                        // Outer ring (if we have overflow, inset by 4dp)
                        if (totalProgress > 1f) {
                            // Outer ring track
                            drawArc(
                                color = ringColor,
                                startAngle = -90f,
                                sweepAngle = 360f,
                                useCenter = false,
                                style = Stroke(width = 6.dp.toPx(), cap = StrokeCap.Round, pathEffect = dashEffect),
                                topLeft = androidx.compose.ui.geometry.Offset(4.dp.toPx(), 4.dp.toPx()),
                                size = androidx.compose.ui.geometry.Size(canvasWidth - 8.dp.toPx(), canvasHeight - 8.dp.toPx())
                            )

                            // Outer ring progress
                            drawArc(
                                color = outerColor,
                                startAngle = -90f,
                                sweepAngle = 360f * outerAnimatedProgress,
                                useCenter = false,
                                style = Stroke(width = 6.dp.toPx(), cap = StrokeCap.Round, pathEffect = dashEffect),
                                topLeft = androidx.compose.ui.geometry.Offset(4.dp.toPx(), 4.dp.toPx()),
                                size = androidx.compose.ui.geometry.Size(canvasWidth - 8.dp.toPx(), canvasHeight - 8.dp.toPx())
                            )
                        }
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        val hours = (studiedSeconds / 3600.0)
                        val targetHours = (uiState.adaptiveTargetMinutes / 60.0)
                        val multiplier = if (targetHours > 0) hours / targetHours else 1.0

                        Text(
                            text = String.format("%.1fh", hours),
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )

                        if (multiplier >= 1.0) {
                            Text(
                                text = String.format("%.1fx goal", multiplier),
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFD97706)
                            )
                        } else {
                            Text(
                                text = if (uiState.isAdaptiveAboveBase) {
                                    String.format("of %.1fh adaptive", targetHours)
                                } else {
                                    String.format("of %.1fh target", targetHours)
                                },
                                style = MaterialTheme.typography.labelSmall,
                                color = if (uiState.isAdaptiveAboveBase) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                // Streak Badge & Momentum Column
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Streak Card
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.LocalFireDepartment,
                                contentDescription = "Streak",
                                tint = if (uiState.currentStreak > 0) Color(0xFFF97316) else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                            Column {
                                Text(
                                    text = "${uiState.currentStreak} Day Streak",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = if (uiState.currentStreak > 0) "Keep it up!" else "Study to start",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    // Momentum Card
                    val momentum = uiState.momentum
                    if (momentum != null) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                val icon: androidx.compose.ui.graphics.vector.ImageVector
                                val iconColor: androidx.compose.ui.graphics.Color
                                val statusText: String
                                val descriptionText: String

                                 when (momentum.level) {
                                    com.aspharier.studytimer.domain.model.MomentumLevel.SURGING -> {
                                        icon = Icons.AutoMirrored.Filled.TrendingUp
                                        iconColor = Color(0xFF22C55E)
                                        statusText = "Surging!"
                                        descriptionText = String.format("+%.0f%% vs last wk", momentum.changePercent)
                                    }
                                    com.aspharier.studytimer.domain.model.MomentumLevel.RISING -> {
                                        icon = Icons.AutoMirrored.Filled.TrendingUp
                                        iconColor = Color(0xFF10B981)
                                        statusText = "Rising"
                                        descriptionText = String.format("+%.0f%% vs last wk", momentum.changePercent)
                                    }
                                    com.aspharier.studytimer.domain.model.MomentumLevel.STEADY -> {
                                        icon = Icons.AutoMirrored.Filled.TrendingFlat
                                        iconColor = Color(0xFF3B82F6)
                                        statusText = "Steady"
                                        descriptionText = "Holding the line"
                                    }
                                    com.aspharier.studytimer.domain.model.MomentumLevel.SLIPPING -> {
                                        icon = Icons.AutoMirrored.Filled.TrendingDown
                                        iconColor = Color(0xFFF59E0B)
                                        statusText = "Slipping"
                                        descriptionText = String.format("%.0f%% vs last wk", momentum.changePercent)
                                    }
                                    com.aspharier.studytimer.domain.model.MomentumLevel.FALLING -> {
                                        icon = Icons.AutoMirrored.Filled.TrendingDown
                                        iconColor = Color(0xFFEF4444)
                                        statusText = "Falling"
                                        descriptionText = String.format("%.0f%% vs last wk", momentum.changePercent)
                                    }
                                    com.aspharier.studytimer.domain.model.MomentumLevel.BUILDING_BASELINE -> {
                                        icon = Icons.Default.HourglassEmpty
                                        iconColor = MaterialTheme.colorScheme.onSurfaceVariant
                                        statusText = "Baseline"
                                        descriptionText = "Building baseline"
                                    }
                                }

                                Icon(
                                    imageVector = icon,
                                    contentDescription = "Momentum",
                                    tint = iconColor,
                                    modifier = Modifier.size(20.dp)
                                )
                                Column {
                                    Text(
                                        text = statusText,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = descriptionText,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }

                    // Start Session CTA
                    Button(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            onStartSession(null, null)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary
                        ),
                        contentPadding = PaddingValues(vertical = 12.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Start Focusing", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Weekly Challenges Card Section
        if (uiState.weeklyChallenges.isNotEmpty()) {
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f)
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Weekly Challenges",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )

                            // Remaining days in week
                            val today = LocalDate.now()
                            val nextMonday = today.with(java.time.DayOfWeek.SUNDAY).plusDays(1)
                            val daysLeft = ChronoUnit.DAYS.between(today, nextMonday)
                            Text(
                                text = "${daysLeft}d left",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }

                        uiState.weeklyChallenges.forEach { challenge ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(
                                        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.6f),
                                        shape = RoundedCornerShape(16.dp)
                                    )
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Challenge Icon Box
                                Box(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .background(
                                            color = if (challenge.isCompleted) Color(0xFF22C55E).copy(alpha = 0.15f)
                                            else MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                            shape = CircleShape
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    val icon = when (challenge.icon) {
                                        com.aspharier.studytimer.domain.model.ChallengeIcon.CONSISTENCY -> Icons.Default.CalendarToday
                                        com.aspharier.studytimer.domain.model.ChallengeIcon.TIME_STRETCH -> Icons.Default.Timer
                                        com.aspharier.studytimer.domain.model.ChallengeIcon.PERSONAL_BEST -> Icons.Default.Star
                                    }
                                    Icon(
                                        imageVector = icon,
                                        contentDescription = null,
                                        tint = if (challenge.isCompleted) Color(0xFF22C55E) else MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }

                                Column(modifier = Modifier.weight(1f)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = challenge.title,
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                        if (challenge.isCompleted) {
                                            Text(
                                                text = "Completed!",
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFF22C55E)
                                            )
                                        } else {
                                            val progressText = when (challenge.icon) {
                                                com.aspharier.studytimer.domain.model.ChallengeIcon.CONSISTENCY -> "${challenge.currentValue}/${challenge.targetValue} days"
                                                com.aspharier.studytimer.domain.model.ChallengeIcon.TIME_STRETCH -> "${(challenge.currentValue / 3600.0).roundToInt()}h/${(challenge.targetValue / 3600.0).roundToInt()}h"
                                                com.aspharier.studytimer.domain.model.ChallengeIcon.PERSONAL_BEST -> "${String.format("%.1f", challenge.currentValue / 3600.0)}h/${String.format("%.1f", challenge.targetValue / 3600.0)}h"
                                            }
                                            Text(
                                                text = progressText,
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = challenge.description,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    LinearProgressIndicator(
                                        progress = { challenge.progressPercent },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(6.dp)
                                            .clip(CircleShape),
                                        color = if (challenge.isCompleted) Color(0xFF22C55E) else MaterialTheme.colorScheme.primary,
                                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }


        // Subject Syllabus Progress Summary
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f)
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "Syllabus Progress",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    if (uiState.subjects.isNotEmpty()) {
                        uiState.subjects.forEach { subject ->
                            SubjectProgressItem(subject = subject)
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    onSyllabusClick()
                                }
                                .padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "View Syllabus & Topics",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Icon(
                                imageVector = Icons.Default.ChevronRight,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    } else {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "No subjects added yet.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            if (uiState.activeExamGoal != null) {
                                TextButton(
                                    onClick = {
                                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                        onSyllabusClick()
                                    }
                                ) {
                                    Text("Add Subjects to Syllabus", color = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SubjectProgressItem(subject: Subject) {
    val progress = subject.completionPercentage
    val percentString = (progress * 100).roundToInt()
    val subjectColor = remember(subject.colorHex) {
        try {
            Color(android.graphics.Color.parseColor(subject.colorHex))
        } catch (_: Exception) {
            Color(0xFF4D96FF)
        }
    }

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = subject.name,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            Text(
                text = "$percentString%",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = subjectColor
            )
        }

        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(CircleShape),
            color = subjectColor,
            trackColor = MaterialTheme.colorScheme.surfaceVariant
        )
    }
}
