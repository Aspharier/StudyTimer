package com.aspharier.studytimer.ui.screens.syllabus

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aspharier.studytimer.domain.model.Subject
import com.aspharier.studytimer.domain.model.Topic
import com.aspharier.studytimer.domain.model.TopicStatus
import kotlin.math.roundToInt

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SyllabusScreen(
    onNavigateBack: () -> Unit,
    viewModel: SyllabusViewModel = hiltViewModel()
) {
    val haptic = LocalHapticFeedback.current
    val uiState by viewModel.uiState.collectAsState()

    var showAddSubjectDialog by remember { mutableStateOf(false) }
    var showEditSubjectDialog by remember { mutableStateOf<Subject?>(null) }
    var showDeleteSubjectDialog by remember { mutableStateOf<Subject?>(null) }
    var showAddTopicDialogSubjectId by remember { mutableStateOf<Long?>(null) }

    val colorPresets = remember {
        listOf(
            "#4D96FF", // Blue
            "#FF6B6B", // Red
            "#6BCB77", // Green
            "#FFD93D", // Yellow
            "#95CD41", // Lime
            "#F473B9", // Pink
            "#A855F7", // Purple
            "#F97316"  // Orange
        )
    }

    Scaffold(
        floatingActionButton = {
            if (uiState.activeExamGoalId != null) {
                FloatingActionButton(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        showAddSubjectDialog = true
                    },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Icon(imageVector = Icons.Default.Add, contentDescription = "Add Subject")
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(innerPadding)
        ) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onNavigateBack()
                    },
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

                Spacer(modifier = Modifier.width(16.dp))

                Column {
                    Text(
                        text = "Syllabus",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )

                    val overallPercent = (uiState.overallCompletion * 100).roundToInt()
                    Text(
                        text = "Overall completion: $overallPercent%",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Main List
            if (uiState.activeExamGoalId == null) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Set an active exam goal first to manage your syllabus subjects and topics.",
                        style = MaterialTheme.typography.titleMedium,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else if (uiState.subjects.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = "No subjects added yet.",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Button(
                            onClick = { showAddSubjectDialog = true },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Add Your First Subject")
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 80.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(uiState.subjects, key = { it.id }) { subject ->
                        var isExpanded by remember { mutableStateOf(false) }

                        SubjectCard(
                            subject = subject,
                            isExpanded = isExpanded,
                            onToggleExpand = {
                                isExpanded = !isExpanded
                                if (isExpanded) {
                                    viewModel.loadTopicsForSubject(subject.id)
                                } else {
                                    viewModel.unloadTopicsForSubject(subject.id)
                                }
                            },
                            topics = uiState.topicsBySubject[subject.id] ?: emptyList(),
                            onAddTopicClick = { showAddTopicDialogSubjectId = subject.id },
                            onDeleteTopic = { topicId -> viewModel.deleteTopic(topicId) },
                            onCycleTopicStatus = { topic -> viewModel.cycleTopicStatus(topic) },
                            onEditClick = { showEditSubjectDialog = subject },
                            onDeleteClick = { showDeleteSubjectDialog = subject },
                            onAddSubTopic = { topic, name -> viewModel.addSubTopic(topic, name) },
                            onDeleteSubTopic = { topic, subId -> viewModel.deleteSubTopic(topic, subId) },
                            onCycleSubTopicStatus = { topic, subId -> viewModel.cycleSubTopicStatus(topic, subId) }
                        )
                    }
                }
            }
        }
    }

    // Add Subject Dialog
    if (showAddSubjectDialog) {
        var subjectName by remember { mutableStateOf("") }
        var selectedColorHex by remember { mutableStateOf(colorPresets.first()) }

        AlertDialog(
            onDismissRequest = { showAddSubjectDialog = false },
            title = { Text("Add Subject") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    OutlinedTextField(
                        value = subjectName,
                        onValueChange = { subjectName = it },
                        label = { Text("Subject Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Text("Pick Theme Color:", style = MaterialTheme.typography.bodyMedium)

                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        colorPresets.forEach { colorStr ->
                            val color = Color(android.graphics.Color.parseColor(colorStr))
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(color)
                                    .clickable { selectedColorHex = colorStr }
                                    .padding(4.dp)
                            ) {
                                if (selectedColorHex == colorStr) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .clip(CircleShape)
                                            .background(Color.White.copy(alpha = 0.6f))
                                    )
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (subjectName.isNotBlank()) {
                            viewModel.addSubject(subjectName.trim(), selectedColorHex)
                            showAddSubjectDialog = false
                        }
                    }
                ) {
                    Text("Add")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddSubjectDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Edit Subject Dialog
    showEditSubjectDialog?.let { currentSubject ->
        var subjectName by remember { mutableStateOf(currentSubject.name) }
        var selectedColorHex by remember { mutableStateOf(currentSubject.colorHex) }

        AlertDialog(
            onDismissRequest = { showEditSubjectDialog = null },
            title = { Text("Edit Subject") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    OutlinedTextField(
                        value = subjectName,
                        onValueChange = { subjectName = it },
                        label = { Text("Subject Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Text("Pick Theme Color:", style = MaterialTheme.typography.bodyMedium)

                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        colorPresets.forEach { colorStr ->
                            val color = Color(android.graphics.Color.parseColor(colorStr))
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(color)
                                    .clickable { selectedColorHex = colorStr }
                                    .padding(4.dp)
                            ) {
                                if (selectedColorHex == colorStr) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .clip(CircleShape)
                                            .background(Color.White.copy(alpha = 0.6f))
                                    )
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (subjectName.isNotBlank()) {
                            viewModel.updateSubject(
                                currentSubject.copy(
                                    name = subjectName.trim(),
                                    colorHex = selectedColorHex
                                )
                            )
                            showEditSubjectDialog = null
                        }
                    }
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showEditSubjectDialog = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Delete Subject Confirm Dialog
    showDeleteSubjectDialog?.let { currentSubject ->
        AlertDialog(
            onDismissRequest = { showDeleteSubjectDialog = null },
            title = { Text("Delete Subject?") },
            text = { Text("Are you sure you want to delete '${currentSubject.name}'? This will delete all topics inside this subject.") },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteSubject(currentSubject.id)
                        showDeleteSubjectDialog = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Delete", color = MaterialTheme.colorScheme.onError)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteSubjectDialog = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Add Topic Dialog
    showAddTopicDialogSubjectId?.let { targetSubjectId ->
        var topicName by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showAddTopicDialogSubjectId = null },
            title = { Text("Add Topic") },
            text = {
                OutlinedTextField(
                    value = topicName,
                    onValueChange = { topicName = it },
                    label = { Text("Topic Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (topicName.isNotBlank()) {
                            viewModel.addTopic(topicName.trim(), targetSubjectId)
                            showAddTopicDialogSubjectId = null
                        }
                    }
                ) {
                    Text("Add")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddTopicDialogSubjectId = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun SubjectCard(
    subject: Subject,
    isExpanded: Boolean,
    onToggleExpand: () -> Unit,
    topics: List<Topic>,
    onAddTopicClick: () -> Unit,
    onDeleteTopic: (Long) -> Unit,
    onCycleTopicStatus: (Topic) -> Unit,
    onEditClick: () -> Unit,
    onDeleteClick: () -> Unit,
    onAddSubTopic: (Topic, String) -> Unit,
    onDeleteSubTopic: (Topic, String) -> Unit,
    onCycleSubTopicStatus: (Topic, String) -> Unit
) {
    val haptic = LocalHapticFeedback.current
    val progress = subject.completionPercentage
    val percentString = (progress * 100).roundToInt()
    val subjectColor = remember(subject.colorHex) {
        try {
            Color(android.graphics.Color.parseColor(subject.colorHex))
        } catch (_: Exception) {
            Color(0xFF4D96FF)
        }
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .animateContentSize()
            .combinedClickable(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    onToggleExpand()
                },
                onLongClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onDeleteClick()
                }
            ),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Main Details row
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Color indicator dot
                Box(
                    modifier = Modifier
                        .size(16.dp)
                        .clip(CircleShape)
                        .background(subjectColor)
                )

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = subject.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "${subject.completedTopics}/${subject.totalTopics} topics completed",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onEditClick) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = "Edit Subject",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Icon(
                        imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = if (isExpanded) "Collapse" else "Expand",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Progress bar
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(CircleShape),
                color = subjectColor,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )

            // Expanded topics list
            AnimatedVisibility(visible = isExpanded) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.surfaceVariant)

                    if (topics.isNotEmpty()) {
                        topics.forEach { topic ->
                            TopicRowItem(
                                topic = topic,
                                onCycleStatus = { onCycleTopicStatus(topic) },
                                onDelete = { onDeleteTopic(topic.id) },
                                onAddSubTopic = { name -> onAddSubTopic(topic, name) },
                                onDeleteSubTopic = { subId -> onDeleteSubTopic(topic, subId) },
                                onCycleSubTopicStatus = { subId -> onCycleSubTopicStatus(topic, subId) }
                            )
                        }
                    } else {
                        Text(
                            text = "No topics added to this subject.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            textAlign = TextAlign.Center
                        )
                    }

                    // Add Topic Button
                    TextButton(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            onAddTopicClick()
                        },
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    ) {
                        Icon(imageVector = Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Add Topic", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun TopicRowItem(
    topic: Topic,
    onCycleStatus: () -> Unit,
    onDelete: () -> Unit,
    onAddSubTopic: (String) -> Unit,
    onDeleteSubTopic: (String) -> Unit,
    onCycleSubTopicStatus: (String) -> Unit
) {
    val haptic = LocalHapticFeedback.current
    var showAddSubTopicDialog by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = topic.name,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Status Chip
                val (chipColor, textColor, text) = when (topic.status) {
                    TopicStatus.NOT_STARTED -> Triple(MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.colorScheme.onSurfaceVariant, "Not Started")
                    TopicStatus.IN_PROGRESS -> Triple(Color(0xFF3B82F6).copy(alpha = 0.2f), Color(0xFF3B82F6), "In Progress")
                    TopicStatus.COMPLETED -> Triple(Color(0xFF10B981).copy(alpha = 0.2f), Color(0xFF10B981), "Completed")
                    TopicStatus.NEEDS_REVISION -> Triple(Color(0xFFF97316).copy(alpha = 0.2f), Color(0xFFF97316), "Needs Revision")
                }

                Surface(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onCycleStatus()
                    },
                    shape = CircleShape,
                    color = chipColor,
                    modifier = Modifier.height(28.dp)
                ) {
                    Text(
                        text = text,
                        color = textColor,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                    )
                }

                IconButton(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        showAddSubTopicDialog = true
                    },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Add Sub-topic",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp)
                    )
                }

                IconButton(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        onDelete()
                    },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Delete Topic",
                        tint = MaterialTheme.colorScheme.error.copy(alpha = 0.7f),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }

        // Subtopics List
        if (topic.subTopics.isNotEmpty()) {
            topic.subTopics.forEach { subTopic ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 16.dp, top = 2.dp, bottom = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        // Small indicator dot/dash
                        Box(
                            modifier = Modifier
                                .size(4.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f))
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = subTopic.name,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        // Subtopic Status Chip
                        val (subChipColor, subTextColor, subText) = when (subTopic.status) {
                            TopicStatus.NOT_STARTED -> Triple(MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.colorScheme.onSurfaceVariant, "Not Started")
                            TopicStatus.IN_PROGRESS -> Triple(Color(0xFF3B82F6).copy(alpha = 0.2f), Color(0xFF3B82F6), "In Progress")
                            TopicStatus.COMPLETED -> Triple(Color(0xFF10B981).copy(alpha = 0.2f), Color(0xFF10B981), "Finished")
                            else -> Triple(MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.colorScheme.onSurfaceVariant, "Not Started")
                        }

                        Surface(
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                onCycleSubTopicStatus(subTopic.id)
                            },
                            shape = CircleShape,
                            color = subChipColor,
                            modifier = Modifier.height(24.dp)
                        ) {
                            Text(
                                text = subText,
                                color = subTextColor,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                            )
                        }

                        IconButton(
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                onDeleteSubTopic(subTopic.id)
                            },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = "Delete Sub-topic",
                                tint = MaterialTheme.colorScheme.error.copy(alpha = 0.5f),
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }
            }
        }
    }

    // Add Sub-topic Dialog
    if (showAddSubTopicDialog) {
        var subTopicNameInput by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showAddSubTopicDialog = false },
            title = { Text("Add Sub-topic") },
            text = {
                OutlinedTextField(
                    value = subTopicNameInput,
                    onValueChange = { subTopicNameInput = it },
                    label = { Text("Sub-topic Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (subTopicNameInput.isNotBlank()) {
                            onAddSubTopic(subTopicNameInput.trim())
                            showAddSubTopicDialog = false
                        }
                    }
                ) {
                    Text("Add")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddSubTopicDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
