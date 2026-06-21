package com.aspharier.studytimer.ui.screens.profile

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Button
import androidx.compose.material3.TextButton
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material.icons.filled.Delete
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import com.aspharier.studytimer.domain.model.StudySession
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import androidx.compose.ui.platform.LocalContext
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.aspharier.studytimer.R

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ProfileScreen(
    onNavigateBack: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val sessions by viewModel.sessions.collectAsState()
    val subjects by viewModel.subjects.collectAsState()
    val context = LocalContext.current
    val currentUser by viewModel.currentUser.collectAsState()
    val syncStatus by viewModel.syncStatus.collectAsState()
    val lastSyncTime by viewModel.lastSyncTime.collectAsState()

    val gso = remember {
        GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(context.getString(R.string.default_web_client_id))
            .requestEmail()
            .build()
    }
    val googleSignInClient = remember { GoogleSignIn.getClient(context, gso) }

    val authLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)
            account?.idToken?.let { token ->
                viewModel.signInWithGoogleToken(token)
            }
        } catch (_: Exception) {
        }
    }

    val completedSessions = remember(sessions) {
        sessions.filter { it.completedDurationSeconds > 0 || it.isCompleted }
    }
    val totalSeconds = remember(completedSessions) {
        completedSessions.sumOf { it.completedDurationSeconds }
    }
    val streak = remember(completedSessions) {
        calculateCurrentStreak(completedSessions)
    }
    val title = remember(totalSeconds) {
        studyTitle(totalSeconds)
    }
    val dailyTotals = remember(completedSessions) {
        completedSessions
            .groupBy { it.date }
            .mapValues { entry -> entry.value.sumOf { it.completedDurationSeconds } }
    }
    val sessionsByDate = remember(completedSessions) {
        completedSessions.groupBy { it.date }
    }

    var selectedDate by remember { mutableStateOf<LocalDate?>(null) }

    if (selectedDate != null) {
        val dateKey = selectedDate!!.format(DateTimeFormatter.ISO_LOCAL_DATE)
        val daySessions = sessionsByDate[dateKey] ?: emptyList()
        val dayTotal = dailyTotals[dateKey] ?: 0L

        DayDetailDialog(
            date = selectedDate!!,
            totalSeconds = dayTotal,
            sessions = daySessions,
            onDismiss = { selectedDate = null },
            onDeleteSession = { viewModel.deleteSession(it) }
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(32.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = MaterialTheme.colorScheme.onBackground
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Profile",
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onBackground
                )
            }
        }

        item {
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                maxItemsInEachRow = 2
            ) {
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.School,
                    label = "Current Title",
                    value = title
                )
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.Timer,
                    label = "Sessions Completed",
                    value = completedSessions.size.toString()
                )
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.AccessTime,
                    label = "Total Time Studied",
                    value = formatDuration(totalSeconds)
                )
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Default.LocalFireDepartment,
                    label = "Current Streak",
                    value = "$streak days"
                )
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Cloud Sync",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    if (currentUser != null) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Connected",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    text = currentUser?.email ?: "",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                lastSyncTime?.let { time ->
                                    Text(
                                        text = "Last Synced: $time",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                                        modifier = Modifier.padding(top = 2.dp)
                                    )
                                }
                            }
                            
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = { viewModel.syncData() },
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text("Sync Now")
                                }
                                TextButton(
                                    onClick = { viewModel.logout() }
                                ) {
                                    Text("Sign Out", color = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text(
                                text = "Sign in to sync your exam goals, subjects, syllabus topics, and study sessions with the web app on your laptop.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Button(
                                onClick = {
                                    googleSignInClient.signOut().addOnCompleteListener {
                                        authLauncher.launch(googleSignInClient.signInIntent)
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Sign In with Google")
                            }
                        }
                    }

                    syncStatus?.let { status ->
                        Text(
                            text = status,
                            style = MaterialTheme.typography.bodySmall,
                            color = if (status.startsWith("Sync failed") || status.startsWith("Login failed")) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
            }
        }

        item {
            ActivityCard(
                dailyTotals = dailyTotals,
                sessionCount = completedSessions.size,
                streak = streak,
                onDayClick = { date -> selectedDate = date }
            )
        }

        item {
            StudyAnalysisCard(sessions = completedSessions)
        }

        if (subjects.isNotEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f)
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text(
                            text = "Syllabus Completion",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        subjects.forEach { subject ->
                            val progress = subject.completionPercentage
                            val percentString = (progress * 100).toInt()
                            val subjectColor = remember(subject.colorHex) {
                                try {
                                    Color(android.graphics.Color.parseColor(subject.colorHex))
                                } catch (_: Exception) {
                                    Color(0xFF4D96FF)
                                }
                            }

                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
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
                                        text = "$percentString% (${subject.completedTopics}/${subject.totalTopics} topics)",
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.Bold,
                                        color = subjectColor
                                    )
                                }

                                LinearProgressIndicator(
                                    progress = { progress },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(6.dp)
                                        .clip(CircleShape),
                                    color = subjectColor,
                                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun DayDetailDialog(
    date: LocalDate,
    totalSeconds: Long,
    sessions: List<StudySession>,
    onDismiss: () -> Unit,
    onDeleteSession: (Long) -> Unit
) {
    val dateLabel = date.format(DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy"))
    var sessionToDelete by remember { mutableStateOf<StudySession?>(null) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.88f)
                .padding(vertical = 24.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = dateLabel,
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Total study time highlight
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        modifier = Modifier.padding(vertical = 16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = if (totalSeconds > 0) formatDuration(totalSeconds) else "No study",
                            style = MaterialTheme.typography.headlineMedium,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Total Study Time",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                if (sessions.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(18.dp))
                    Text(
                        text = "Sessions (${sessions.size})",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    sessions.forEachIndexed { index, session ->
                        SessionRow(
                            session = session,
                            onDeleteClick = { sessionToDelete = session }
                        )
                        if (index < sessions.lastIndex) {
                            HorizontalDivider(
                                modifier = Modifier.padding(vertical = 6.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                            )
                        }
                    }
                } else {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "No sessions recorded on this day.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    )
                }
            }
        }
    }

    if (sessionToDelete != null) {
        AlertDialog(
            onDismissRequest = { sessionToDelete = null },
            title = { Text("Delete Session?") },
            text = { Text("Are you sure you want to delete '${sessionToDelete?.label.orEmpty().ifBlank { "Study Session" }}'? This cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        sessionToDelete?.let { onDeleteSession(it.id) }
                        sessionToDelete = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Delete", color = MaterialTheme.colorScheme.onError)
                }
            },
            dismissButton = {
                TextButton(onClick = { sessionToDelete = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun SessionRow(
    session: StudySession,
    onDeleteClick: () -> Unit
) {
    val timeFormatter = DateTimeFormatter.ofPattern("hh:mm a")
    val startFormatted = remember(session.startTime) {
        Instant.ofEpochMilli(session.startTime)
            .atZone(ZoneId.systemDefault())
            .format(timeFormatter)
    }
    val duration = formatDuration(session.completedDurationSeconds)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.25f))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = session.label.ifBlank { "Study Session" },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = startFormatted,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = duration,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )
            IconButton(
                onClick = onDeleteClick,
                modifier = Modifier.size(32.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Delete Session",
                    tint = MaterialTheme.colorScheme.error.copy(alpha = 0.8f),
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

@Composable
private fun StatCard(
    icon: ImageVector,
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.height(94.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1
                )
                Text(
                    text = value,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1
                )
            }
        }
    }
}

@Composable
private fun ActivityCard(
    dailyTotals: Map<String, Long>,
    sessionCount: Int,
    streak: Int,
    onDayClick: (LocalDate) -> Unit
) {
    var monthOffset by rememberSaveable { androidx.compose.runtime.mutableIntStateOf(0) }
    val selectedMonth = remember(monthOffset) {
        YearMonth.now().minusMonths(monthOffset.toLong())
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "Study Activity",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "$sessionCount sessions in the past year - Current streak: $streak days",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "Tracking since ${trackingDate(dailyTotals)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(16.dp))

            MonthActivityPager(
                month = selectedMonth,
                dailyTotals = dailyTotals,
                canGoBack = monthOffset < 11,
                canGoForward = monthOffset > 0,
                onPreviousMonth = { monthOffset += 1 },
                onNextMonth = { monthOffset -= 1 },
                onDayClick = onDayClick
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MonthActivityPager(
    month: YearMonth,
    dailyTotals: Map<String, Long>,
    canGoBack: Boolean,
    canGoForward: Boolean,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit,
    onDayClick: (LocalDate) -> Unit
) {
    BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
        val cellGap = 4.dp

        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onPreviousMonth,
                    enabled = canGoBack
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                        contentDescription = "Previous month",
                        tint = if (canGoBack) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f)
                        }
                    )
                }

                Text(
                    text = month.atDay(1).format(DateTimeFormatter.ofPattern("MMMM yyyy")),
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold
                )

                IconButton(
                    onClick = onNextMonth,
                    enabled = canGoForward
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = "Next month",
                        tint = if (canGoForward) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f)
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            MonthActivitySection(
                month = month,
                dailyTotals = dailyTotals,
                cellGap = cellGap,
                onDayClick = onDayClick
            )

            Spacer(modifier = Modifier.height(14.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Less",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(6.dp))
                HeatLegend()
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "More",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MonthActivitySection(
    month: YearMonth,
    dailyTotals: Map<String, Long>,
    cellGap: Dp,
    onDayClick: (LocalDate) -> Unit
) {
    val firstDay = month.atDay(1)
    val daysInMonth = month.lengthOfMonth()
    val leadingBlankDays = firstDay.dayOfWeek.value % 7
    val calendarCells = buildList<LocalDate?> {
        repeat(leadingBlankDays) { add(null) }
        (1..daysInMonth).forEach { day -> add(month.atDay(day)) }
        while (size % 7 != 0) add(null)
    }

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(cellGap)
        ) {
            listOf("S", "M", "T", "W", "T", "F", "S").forEach { day ->
                Text(
                    text = day,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(cellGap)
        ) {
            calendarCells.chunked(7).forEach { week ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(cellGap)
                ) {
                    week.forEach { date ->
                        if (date == null) {
                            Spacer(
                                modifier = Modifier
                                    .weight(1f)
                                    .aspectRatio(1f)
                            )
                        } else {
                            ActivityCell(
                                seconds = dailyTotals[date.format(DateTimeFormatter.ISO_LOCAL_DATE)] ?: 0L,
                                modifier = Modifier
                                    .weight(1f)
                                    .aspectRatio(1f),
                                onClick = { onDayClick(date) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StudyAnalysisCard(
    sessions: List<StudySession>
) {
    var selectedRange by rememberSaveable { mutableStateOf(AnalysisRange.Last7) }
    val analysis = remember(sessions, selectedRange) {
        buildAnalysis(sessions, selectedRange)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier
                .animateContentSize()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Study Analysis",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Tag breakdown",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Text(
                    text = analysis.rangeLabel,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            AnalysisRangeTabs(
                selectedRange = selectedRange,
                onRangeSelected = { selectedRange = it }
            )

            Spacer(modifier = Modifier.height(16.dp))

            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                maxItemsInEachRow = 3
            ) {
                AnalysisMetric(
                    modifier = Modifier.weight(1f),
                    label = "Hours",
                    value = formatDecimalHours(analysis.totalSeconds)
                )
                AnalysisMetric(
                    modifier = Modifier.weight(1f),
                    label = "Sessions",
                    value = analysis.sessionCount.toString()
                )
                AnalysisMetric(
                    modifier = Modifier.weight(1f),
                    label = "Avg Time",
                    value = formatDecimalHours(analysis.averageSeconds)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            if (analysis.sessionCount == 0) {
                EmptyAnalysisState()
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(18.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TagDonutChart(
                        breakdown = analysis.breakdown,
                        modifier = Modifier.size(130.dp)
                    )
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        analysis.breakdown.forEach { item ->
                            TagLegendRow(item)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(22.dp))

                AnalysisBarChart(days = analysis.bars)
            }
        }
    }
}

@Composable
private fun AnalysisRangeTabs(
    selectedRange: AnalysisRange,
    onRangeSelected: (AnalysisRange) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.38f))
            .padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        AnalysisRange.entries.forEach { range ->
            val selected = range == selectedRange
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(8.dp))
                    .background(
                        if (selected) MaterialTheme.colorScheme.primaryContainer
                        else Color.Transparent
                    )
                    .clickable { onRangeSelected(range) }
                    .padding(vertical = 9.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = range.label,
                    style = MaterialTheme.typography.labelMedium,
                    color = if (selected) {
                        MaterialTheme.colorScheme.onPrimaryContainer
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                    maxLines = 1
                )
            }
        }
    }
}

@Composable
private fun AnalysisMetric(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .height(72.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.28f))
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Column(verticalArrangement = Arrangement.Center) {
            Text(
                text = label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Bold,
                maxLines = 1
            )
        }
    }
}

@Composable
private fun TagDonutChart(
    breakdown: List<TagBreakdown>,
    modifier: Modifier = Modifier
) {
    val fallbackColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
    Canvas(modifier = modifier) {
        if (breakdown.isEmpty()) {
            drawCircle(color = fallbackColor, style = Stroke(width = 28.dp.toPx()))
            return@Canvas
        }

        var startAngle = -90f
        breakdown.forEach { item ->
            val sweep = 360f * item.fraction
            drawArc(
                color = item.color,
                startAngle = startAngle,
                sweepAngle = sweep,
                useCenter = false,
                style = Stroke(width = 28.dp.toPx())
            )
            startAngle += sweep
        }
    }
}

@Composable
private fun TagLegendRow(item: TagBreakdown) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(9.dp)
                .clip(RoundedCornerShape(50))
                .background(item.color)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = item.label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = formatDecimalHours(item.seconds),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = "${(item.fraction * 100).toInt()}%",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun AnalysisBarChart(days: List<AnalysisBar>) {
    val maxSeconds = days.maxOfOrNull { it.seconds }?.coerceAtLeast(1L) ?: 1L

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(180.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.Bottom
    ) {
        days.forEach { day ->
            val fraction = (day.seconds.toFloat() / maxSeconds).coerceIn(0.04f, 1f)
            val animatedFraction by animateFloatAsState(
                targetValue = fraction,
                label = "analysisBarHeight"
            )
            Column(
                modifier = Modifier.weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Bottom
            ) {
                Text(
                    text = if (day.seconds > 0) compactDuration(day.seconds) else "",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1
                )
                Spacer(modifier = Modifier.height(6.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.74f)
                        .fillMaxHeight(animatedFraction)
                        .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
                        .background(day.color)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = day.label,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1
                )
            }
        }
    }
}

@Composable
private fun EmptyAnalysisState() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(150.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.22f)),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "No study sessions in this range yet.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ActivityCell(
    seconds: Long,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(3.dp))
            .background(activityColor(seconds))
            .clickable(onClick = onClick)
    )
}

@Composable
private fun HeatLegend() {
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        listOf(0L, 15L * 60L, 45L * 60L, 90L * 60L, 180L * 60L).forEach { seconds ->
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(activityColor(seconds))
            )
        }
    }
}

@Composable
private fun activityColor(seconds: Long): Color {
    return when {
        seconds <= 0 -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
        seconds < 30 * 60 -> MaterialTheme.colorScheme.primary.copy(alpha = 0.35f)
        seconds < 60 * 60 -> MaterialTheme.colorScheme.primary.copy(alpha = 0.55f)
        seconds < 120 * 60 -> MaterialTheme.colorScheme.primary.copy(alpha = 0.75f)
        else -> MaterialTheme.colorScheme.primary
    }
}

private fun formatDuration(seconds: Long): String {
    val hours = seconds / 3600
    val minutes = (seconds % 3600) / 60
    return "${hours}h ${minutes}m"
}

private fun studyTitle(totalSeconds: Long): String {
    val hours = totalSeconds / 3600
    return when {
        hours >= 250 -> "Master"
        hours >= 100 -> "Scholar"
        hours >= 40 -> "Focused"
        hours >= 10 -> "Learner"
        else -> "Starter"
    }
}

private fun calculateCurrentStreak(sessions: List<StudySession>): Int {
    val studiedDates = sessions
        .filter { it.completedDurationSeconds > 0 }
        .mapTo(mutableSetOf()) { LocalDate.parse(it.date) }
    var date = LocalDate.now()
    var streak = 0

    while (studiedDates.contains(date)) {
        streak += 1
        date = date.minusDays(1)
    }

    return streak
}

private fun trackingDate(dailyTotals: Map<String, Long>): String {
    val firstDate = dailyTotals.keys.minOrNull()?.let(LocalDate::parse) ?: LocalDate.now()
    return firstDate.format(DateTimeFormatter.ofPattern("M/d/yyyy"))
}

private enum class AnalysisRange(val label: String, val days: Long) {
    Last7("Last 7", 7),
    Weekly("Weekly", 7),
    Monthly("Monthly", 30),
    Yearly("Yearly", 365)
}

private data class StudyAnalysis(
    val totalSeconds: Long,
    val averageSeconds: Long,
    val sessionCount: Int,
    val rangeLabel: String,
    val breakdown: List<TagBreakdown>,
    val bars: List<AnalysisBar>
)

private data class TagBreakdown(
    val label: String,
    val seconds: Long,
    val fraction: Float,
    val color: Color
)

private data class AnalysisBar(
    val label: String,
    val seconds: Long,
    val color: Color
)

private fun buildAnalysis(
    sessions: List<StudySession>,
    range: AnalysisRange
): StudyAnalysis {
    val today = LocalDate.now()
    val startDate = today.minusDays(range.days - 1)
    val filteredSessions = sessions.filter { session ->
        val date = runCatching { LocalDate.parse(session.date) }.getOrNull()
        date != null && !date.isBefore(startDate) && !date.isAfter(today)
    }
    val totalSeconds = filteredSessions.sumOf { it.completedDurationSeconds }
    val averageSeconds = if (filteredSessions.isEmpty()) 0L else totalSeconds / filteredSessions.size
    val palette = listOf(
        Color(0xFFFF6B6B),
        Color(0xFFFF9F43),
        Color(0xFFB8C2CC),
        Color(0xFF4D96FF),
        Color(0xFF6BCB77),
        Color(0xFFA78BFA)
    )
    val breakdown = filteredSessions
        .groupBy { it.label.ifBlank { "No Tag" } }
        .mapValues { entry -> entry.value.sumOf { it.completedDurationSeconds } }
        .entries
        .sortedByDescending { it.value }
        .mapIndexed { index, entry ->
            TagBreakdown(
                label = entry.key,
                seconds = entry.value,
                fraction = if (totalSeconds > 0) entry.value.toFloat() / totalSeconds else 0f,
                color = palette[index % palette.size]
            )
        }

    val bars = buildBars(filteredSessions, range, startDate, today, palette)

    return StudyAnalysis(
        totalSeconds = totalSeconds,
        averageSeconds = averageSeconds,
        sessionCount = filteredSessions.size,
        rangeLabel = "${startDate.format(DateTimeFormatter.ofPattern("MMM d"))} - ${today.format(DateTimeFormatter.ofPattern("MMM d"))}",
        breakdown = breakdown,
        bars = bars
    )
}

private fun buildBars(
    sessions: List<StudySession>,
    range: AnalysisRange,
    startDate: LocalDate,
    today: LocalDate,
    palette: List<Color>
): List<AnalysisBar> {
    val totalsByDate = sessions
        .groupBy { it.date }
        .mapValues { entry -> entry.value.sumOf { it.completedDurationSeconds } }

    return when (range) {
        AnalysisRange.Last7,
        AnalysisRange.Weekly -> (0L until 7L).map { offset ->
            val date = startDate.plusDays(offset)
            AnalysisBar(
                label = date.format(DateTimeFormatter.ofPattern("EEE")),
                seconds = totalsByDate[date.format(DateTimeFormatter.ISO_LOCAL_DATE)] ?: 0L,
                color = palette[(offset % palette.size).toInt()]
            )
        }

        AnalysisRange.Monthly -> (0L until 4L).map { index ->
            val periodStart = startDate.plusDays(index * 7)
            val periodEnd = if (index == 3L) today else periodStart.plusDays(6)
            val seconds = sessions.sumOf { session ->
                val date = LocalDate.parse(session.date)
                if (!date.isBefore(periodStart) && !date.isAfter(periodEnd)) {
                    session.completedDurationSeconds
                } else {
                    0L
                }
            }
            AnalysisBar(
                label = "W${index + 1}",
                seconds = seconds,
                color = palette[(index % palette.size).toInt()]
            )
        }

        AnalysisRange.Yearly -> (11L downTo 0L).map { monthsAgo ->
            val month = YearMonth.from(today.minusMonths(monthsAgo))
            val seconds = sessions.sumOf { session ->
                val date = LocalDate.parse(session.date)
                if (YearMonth.from(date) == month) session.completedDurationSeconds else 0L
            }
            AnalysisBar(
                label = month.atDay(1).format(DateTimeFormatter.ofPattern("MMM")),
                seconds = seconds,
                color = palette[(ChronoUnit.MONTHS.between(YearMonth.from(startDate).atDay(1), month.atDay(1)) % palette.size).toInt()]
            )
        }
    }
}

private fun formatDecimalHours(seconds: Long): String {
    return "${String.format("%.1f", seconds / 3600.0)}h"
}

private fun compactDuration(seconds: Long): String {
    val hours = seconds / 3600
    val minutes = (seconds % 3600) / 60
    return if (hours > 0) "${hours}h ${minutes}m" else "${minutes}m"
}
