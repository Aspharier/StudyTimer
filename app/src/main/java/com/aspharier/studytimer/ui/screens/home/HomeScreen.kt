package com.aspharier.studytimer.ui.screens.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Notes
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import com.aspharier.studytimer.domain.model.SessionTag
import com.aspharier.studytimer.domain.model.Subject
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aspharier.studytimer.domain.model.StudySession
import com.aspharier.studytimer.ui.theme.AppTheme
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun HomeScreen(
    selectedTheme: AppTheme,
    onThemeSelected: (AppTheme) -> Unit,
    onProfileClick: () -> Unit,
    onStartTimer: (sessionId: Long, label: String, focusMinutes: Int, shortBreakMinutes: Int, longBreakMinutes: Int, cycles: Int, subjectId: Long?, tag: String?, notes: String?) -> Unit,
    onNavigateBack: () -> Unit = {},
    viewModel: HomeViewModel = hiltViewModel()
) {
    val haptic = LocalHapticFeedback.current
    val allSessions by viewModel.allSessions.collectAsState()
    val subjects by viewModel.subjects.collectAsState()

    val completedSessions = remember(allSessions) {
        allSessions.filter { it.completedDurationSeconds > 0 || it.isCompleted }
    }
    val todayString = remember { java.time.LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE) }
    val todaySessions = remember(completedSessions, todayString) {
        completedSessions.filter { it.date == todayString }
    }
    val todayTotalSeconds = remember(todaySessions) {
        todaySessions.sumOf { it.completedDurationSeconds }
    }
    val recentSessions = remember(todaySessions) {
        todaySessions.sortedByDescending { it.startTime }.take(5)
    }

    var sessionLabel by rememberSaveable { mutableStateOf("Study Session") }
    var selectedSubject by remember { mutableStateOf<Subject?>(null) }
    var selectedTag by remember { mutableStateOf<SessionTag?>(null) }
    var notesText by rememberSaveable { mutableStateOf("") }
    var focusMinutes by rememberSaveable { mutableIntStateOf(25) }
    var shortBreakMinutes by rememberSaveable { mutableIntStateOf(5) }
    var longBreakMinutes by rememberSaveable { mutableIntStateOf(15) }
    var cycles by rememberSaveable { mutableIntStateOf(4) }
    var isThemeDropdownExpanded by remember { mutableStateOf(false) }
    var isSubjectDropdownExpanded by remember { mutableStateOf(false) }
    var isNotesExpanded by remember { mutableStateOf(false) }
    var sessionToDelete by remember { mutableStateOf<StudySession?>(null) }

    if (sessionToDelete != null) {
        AlertDialog(
            onDismissRequest = { sessionToDelete = null },
            title = { Text("Delete Session?") },
            text = { Text("Are you sure you want to delete this session? This action cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    sessionToDelete?.let { viewModel.deleteSession(it.id) }
                    sessionToDelete = null
                }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { sessionToDelete = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(top = 24.dp, bottom = 48.dp)
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
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    IconButton(
                        onClick = onNavigateBack,
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Text(
                        text = "Focusly",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                }
            }
            Spacer(modifier = Modifier.height(32.dp))
        }

        // Today's Study Hours
        item {
            Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                Text(
                    text = "Today's Focus Time",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                val hours = todayTotalSeconds / 3600
                val minutes = (todayTotalSeconds % 3600) / 60
                Text(
                    text = "${hours}h ${minutes}m",
                    fontSize = 48.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            Spacer(modifier = Modifier.height(32.dp))
        }

        // Timer Setup
        item {
            Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                Text(
                    text = "Configure Session",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(12.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Subject Dropdown Selector
                        if (subjects.isNotEmpty()) {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(
                                    text = "Select Subject",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Box(modifier = Modifier.fillMaxWidth()) {
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable { isSubjectDropdownExpanded = true },
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(16.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = selectedSubject?.name ?: "Custom Session (No Subject)",
                                                color = if (selectedSubject != null) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                                                style = MaterialTheme.typography.bodyMedium
                                            )
                                            Icon(imageVector = Icons.Default.ArrowDropDown, contentDescription = null)
                                        }
                                    }
                                    DropdownMenu(
                                        expanded = isSubjectDropdownExpanded,
                                        onDismissRequest = { isSubjectDropdownExpanded = false },
                                        modifier = Modifier.fillMaxWidth(0.8f)
                                    ) {
                                        DropdownMenuItem(
                                            text = { Text("Custom Session (No Subject)") },
                                            onClick = {
                                                selectedSubject = null
                                                sessionLabel = ""
                                                isSubjectDropdownExpanded = false
                                            }
                                        )
                                        subjects.forEach { subj ->
                                            DropdownMenuItem(
                                                text = { Text(subj.name) },
                                                onClick = {
                                                    selectedSubject = subj
                                                    sessionLabel = subj.name
                                                    isSubjectDropdownExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        OutlinedTextField(
                            value = sessionLabel,
                            onValueChange = { sessionLabel = it },
                            label = { Text("Session Name") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                unfocusedBorderColor = MaterialTheme.colorScheme.surfaceVariant,
                                focusedLabelColor = MaterialTheme.colorScheme.primary,
                                unfocusedLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                            )
                        )

                        // Session Tag Chips Selector
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                text = "Session Tag",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                SessionTag.entries.forEach { tag ->
                                    val isSelected = selectedTag == tag
                                    val chipColor = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
                                    val textColor = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                                    Surface(
                                        onClick = {
                                            selectedTag = if (isSelected) null else tag
                                        },
                                        shape = CircleShape,
                                        color = chipColor,
                                        modifier = Modifier.height(32.dp)
                                    ) {
                                        Text(
                                            text = tag.displayName,
                                            color = textColor,
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                        )
                                    }
                                }
                            }
                        }

                        // Collapsible Notes
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { isNotesExpanded = !isNotesExpanded }
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Notes,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Text(
                                    text = if (isNotesExpanded) "Hide Notes" else "Add Notes (optional)",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }

                            AnimatedVisibility(visible = isNotesExpanded) {
                                OutlinedTextField(
                                    value = notesText,
                                    onValueChange = { notesText = it },
                                    placeholder = { Text("Enter notes for this study session...") },
                                    modifier = Modifier.fillMaxWidth(),
                                    maxLines = 3,
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                                        unfocusedBorderColor = MaterialTheme.colorScheme.surfaceVariant,
                                        focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                        unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                                    )
                                )
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(4.dp))

                        TimeAdjuster(
                            label = "Focus Time",
                            value = focusMinutes,
                            unit = "min",
                            onIncrease = { 
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                focusMinutes += 5 
                            },
                            onDecrease = { 
                                if (focusMinutes > 5) {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    focusMinutes -= 5 
                                }
                            }
                        )
                        
                        TimeAdjuster(
                            label = "Short Break",
                            value = shortBreakMinutes,
                            unit = "min",
                            onIncrease = { 
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                shortBreakMinutes += 1 
                            },
                            onDecrease = { 
                                if (shortBreakMinutes > 1) {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    shortBreakMinutes -= 1 
                                }
                            }
                        )
                        
                        TimeAdjuster(
                            label = "Long Break",
                            value = longBreakMinutes,
                            unit = "min",
                            onIncrease = { 
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                longBreakMinutes += 5 
                            },
                            onDecrease = { 
                                if (longBreakMinutes > 5) {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    longBreakMinutes -= 5 
                                }
                            }
                        )

                        TimeAdjuster(
                            label = "Cycles",
                            value = cycles,
                            unit = "x",
                            onIncrease = { 
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                cycles += 1 
                            },
                            onDecrease = { 
                                if (cycles > 1) {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    cycles -= 1 
                                }
                            }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
                
                // Start Button
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        val sessionId = System.currentTimeMillis()
                        val finalLabel = sessionLabel.ifBlank { selectedSubject?.name ?: "Study Session" }
                        onStartTimer(
                            sessionId, 
                            finalLabel, 
                            focusMinutes, 
                            shortBreakMinutes, 
                            longBreakMinutes, 
                            cycles,
                            selectedSubject?.id,
                            selectedTag?.name,
                            if (notesText.isNotBlank()) notesText else null
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(64.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    Text(
                        text = "Start Focusing",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            Spacer(modifier = Modifier.height(40.dp))
        }

        // Recent History
        if (recentSessions.isNotEmpty()) {
            item {
                Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                    Text(
                        text = "Today's Sessions",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
            
            items(recentSessions, key = { it.id }) { session ->
                SessionHistoryItem(
                    session = session,
                    modifier = Modifier
                        .padding(horizontal = 24.dp, vertical = 6.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .combinedClickable(
                            onClick = { },
                            onLongClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                sessionToDelete = session
                            }
                        )
                )
            }
        }
    }
}

@Composable
fun TimeAdjuster(
    label: String,
    value: Int,
    unit: String,
    onIncrease: () -> Unit,
    onDecrease: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
        
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .background(
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    shape = RoundedCornerShape(20.dp)
                )
                .padding(4.dp)
        ) {
            IconButton(
                onClick = onDecrease,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Icon(
                    imageVector = Icons.Default.Remove,
                    contentDescription = "Decrease",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp)
                )
            }
            
            Text(
                text = "$value$unit",
                modifier = Modifier.width(72.dp),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
            
            IconButton(
                onClick = onIncrease,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Increase",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@Composable
fun SessionHistoryItem(
    session: StudySession,
    modifier: Modifier = Modifier
) {
    val timeFormatter = DateTimeFormatter.ofPattern("MMM d, hh:mm a")
    val startFormatted = remember(session.startTime) {
        Instant.ofEpochMilli(session.startTime)
            .atZone(ZoneId.systemDefault())
            .format(timeFormatter)
    }
    
    val durationMins = session.completedDurationSeconds / 60
    
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = session.label.ifBlank { "Study Session" },
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = startFormatted,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            Text(
                text = "${durationMins}m",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}
