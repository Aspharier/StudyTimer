package com.aspharier.studytimer.ui.screens.mocktest

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import com.aspharier.studytimer.domain.model.MockTest
import com.aspharier.studytimer.domain.model.Subject
import com.aspharier.studytimer.domain.model.Topic
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt
import kotlin.math.max

// ─── Colour helpers ──────────────────────────────────────────────────────────

private fun parseColor(hex: String?, fallback: Long = 0xFF4D96FF): Color =
    try { Color(android.graphics.Color.parseColor(hex ?: "#4D96FF")) }
    catch (_: Exception) { Color(fallback) }

// ─── Screen ──────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MockTestScreen(
    onNavigateBack: () -> Unit,
    viewModel: MockTestViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val haptic = LocalHapticFeedback.current
    var showAddDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Practice Tests",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleLarge
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onNavigateBack()
                    }) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Default.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        floatingActionButton = {
            if (uiState.activeExamGoal != null && uiState.subjects.isNotEmpty()) {
                FloatingActionButton(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        showAddDialog = true
                    },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Icon(imageVector = Icons.Default.Add, contentDescription = "Log Test")
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (uiState.activeExamGoal == null) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 48.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Set an active Exam Goal first to track practice tests.",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            } else {

                // ── Subject filter chips ──────────────────────────────────────
                item {
                    SubjectFilterRow(
                        subjects = uiState.subjects,
                        selectedSubjectId = uiState.selectedSubjectFilter,
                        onSubjectSelected = { id -> viewModel.setSubjectFilter(id) }
                    )
                }

                // ── Topic filter chips (shown only when a subject is selected) ─
                if (uiState.topicsForSelectedSubject.isNotEmpty()) {
                    item {
                        AnimatedVisibility(
                            visible = true,
                            enter = fadeIn() + expandVertically(),
                            exit = fadeOut() + shrinkVertically()
                        ) {
                            TopicFilterRow(
                                topics = uiState.topicsForSelectedSubject,
                                selectedTopicId = uiState.selectedTopicFilter,
                                onTopicSelected = { id -> viewModel.setTopicFilter(id) }
                            )
                        }
                    }
                }

                // ── Trend chart (filtered) ────────────────────────────────────
                val chartTests = uiState.filteredTests.sortedBy { it.date }
                if (chartTests.isNotEmpty()) {
                    item {
                        val chartLabel = when {
                            uiState.selectedTopicFilter != null ->
                                uiState.topics.find { it.id == uiState.selectedTopicFilter }?.name
                                    ?: "Topic"
                            uiState.selectedSubjectFilter != null ->
                                uiState.subjects.find { it.id == uiState.selectedSubjectFilter }?.name
                                    ?: "Subject"
                            else -> "All Tests"
                        }
                        MockTestTrendChart(
                            mockTests = chartTests,
                            subjects = uiState.subjects,
                            label = chartLabel
                        )
                    }
                }

                // ── History heading ───────────────────────────────────────────
                if (uiState.filteredTests.isNotEmpty()) {
                    item {
                        Text(
                            text = "Test History",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }

                    items(uiState.filteredTests, key = { it.id }) { test ->
                        val subject = uiState.subjects.find { it.id == test.subjectId }
                        val topic = uiState.topics.find { it.id == test.topicId }
                        TestHistoryCard(
                            test = test,
                            subject = subject,
                            topic = topic,
                            onDelete = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                viewModel.deleteMockTest(test.id)
                            }
                        )
                    }
                } else {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "📝",
                                    fontSize = 48.sp
                                )
                                Spacer(Modifier.height(12.dp))
                                Text(
                                    text = "No tests logged yet.\nTap + to record your first result.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddDialog && uiState.activeExamGoal != null && uiState.subjects.isNotEmpty()) {
        AddMockTestDialog(
            subjects = uiState.subjects,
            topics = uiState.topics,
            onDismiss = { showAddDialog = false },
            onSave = { args ->
                viewModel.logMockTest(
                    examGoalId = uiState.activeExamGoal!!.id,
                    subjectId = args.subjectId,
                    topicId = args.topicId,
                    testName = args.testName,
                    obtainedMarks = args.obtainedMarks,
                    totalMarks = args.totalMarks,
                    notes = args.notes,
                    date = args.date,
                    totalQuestions = args.totalQuestions,
                    attempted1Mark = args.attempted1Mark,
                    attempted2Mark = args.attempted2Mark,
                    notAttempted = args.notAttempted,
                    correctMarks = args.correctMarks,
                    penaltyMarks = args.penaltyMarks,
                    totalTimeMinutes = args.totalTimeMinutes,
                    timeTakenMinutes = args.timeTakenMinutes
                )
                showAddDialog = false
            }
        )
    }
}

// ─── Filter rows ─────────────────────────────────────────────────────────────

@Composable
private fun SubjectFilterRow(
    subjects: List<Subject>,
    selectedSubjectId: Long?,
    onSubjectSelected: (Long?) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // "All" chip
        FilterChip(
            selected = selectedSubjectId == null,
            onClick = { onSubjectSelected(null) },
            label = { Text("All", fontWeight = FontWeight.SemiBold) },
            shape = RoundedCornerShape(12.dp)
        )
        subjects.forEach { subject ->
            val color = parseColor(subject.colorHex)
            FilterChip(
                selected = selectedSubjectId == subject.id,
                onClick = {
                    onSubjectSelected(if (selectedSubjectId == subject.id) null else subject.id)
                },
                label = { Text(subject.name, fontWeight = FontWeight.SemiBold) },
                shape = RoundedCornerShape(12.dp),
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = color.copy(alpha = 0.20f),
                    selectedLabelColor = color
                )
            )
        }
    }
}

@Composable
private fun TopicFilterRow(
    topics: List<Topic>,
    selectedTopicId: Long?,
    onTopicSelected: (Long?) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "Topic:",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(end = 4.dp)
        )
        // "All topics" chip
        FilterChip(
            selected = selectedTopicId == null,
            onClick = { onTopicSelected(null) },
            label = { Text("All", fontWeight = FontWeight.Medium) },
            shape = RoundedCornerShape(10.dp)
        )
        topics.forEach { topic ->
            FilterChip(
                selected = selectedTopicId == topic.id,
                onClick = {
                    onTopicSelected(if (selectedTopicId == topic.id) null else topic.id)
                },
                label = { Text(topic.name, fontWeight = FontWeight.Medium) },
                shape = RoundedCornerShape(10.dp)
            )
        }
    }
}

// ─── Trend chart ─────────────────────────────────────────────────────────────

@Composable
fun MockTestTrendChart(
    mockTests: List<MockTest>,
    subjects: List<Subject>,
    label: String = "All Tests"
) {
    val scores = remember(mockTests) { mockTests.sortedBy { it.date } }
    val primaryColor = MaterialTheme.colorScheme.primary
    val gridColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)
    val surfaceColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.15f)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(220.dp),
        colors = CardDefaults.cardColors(containerColor = surfaceColor),
        shape = RoundedCornerShape(20.dp),
        border = androidx.compose.foundation.BorderStroke(
            1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Score Trend",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.06f))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                )
            }
            Spacer(Modifier.height(10.dp))
            Canvas(modifier = Modifier.fillMaxSize()) {
                val w = size.width
                val h = size.height
                val pL = 52f; val pB = 36f; val pT = 12f; val pR = 12f
                val gW = w - pL - pR; val gH = h - pT - pB
                val gridLines = 4
                val paint = android.graphics.Paint().apply {
                    color = android.graphics.Color.GRAY
                    textSize = 22f
                    textAlign = android.graphics.Paint.Align.RIGHT
                }
                // Grid + y-labels
                for (i in 0..gridLines) {
                    val ratio = i.toFloat() / gridLines
                    val y = pT + gH * (1f - ratio)
                    drawLine(gridColor, Offset(pL, y), Offset(w - pR, y), 1.dp.toPx())
                    drawContext.canvas.nativeCanvas.drawText(
                        "${(ratio * 100).roundToInt()}%",
                        pL - 8f, y + 8f, paint
                    )
                }
                if (scores.isEmpty()) return@Canvas
                // Points
                val points = scores.mapIndexed { idx, test ->
                    val x = pL + if (scores.size > 1) gW * idx.toFloat() / (scores.size - 1) else gW / 2f
                    val y = pT + gH * (1f - test.scorePercentage / 100f)
                    Offset(x, y)
                }
                // Gradient fill under line
                for (i in 0 until points.size - 1) {
                    drawLine(
                        color = primaryColor.copy(alpha = 0.15f),
                        start = Offset(points[i].x, h - pB),
                        end = Offset(points[i + 1].x, h - pB),
                        strokeWidth = 1.dp.toPx()
                    )
                }
                // Line
                if (points.size > 1) {
                    for (i in 0 until points.size - 1) {
                        drawLine(
                            color = primaryColor,
                            start = points[i],
                            end = points[i + 1],
                            strokeWidth = 2.5.dp.toPx(),
                            cap = StrokeCap.Round
                        )
                    }
                }
                // Dots + x-date labels
                val datePaint = android.graphics.Paint().apply {
                    color = android.graphics.Color.GRAY
                    textSize = 19f
                    textAlign = android.graphics.Paint.Align.CENTER
                }
                points.forEachIndexed { idx, point ->
                    drawCircle(primaryColor, 5.dp.toPx(), point)
                    drawCircle(Color.White, 2.5.dp.toPx(), point)
                    val dateLabel = try {
                        scores[idx].date.substring(5) // MM-DD
                    } catch (_: Exception) { "" }
                    drawContext.canvas.nativeCanvas.drawText(
                        dateLabel, point.x, h - pB + 24f, datePaint
                    )
                }
            }
        }
    }
}

// ─── 3-panel stats card (Questions / Marks / Time) ───────────────────────────

@Composable
private fun TestResultStatsCard(test: MockTest) {
    if (test.totalQuestions == 0 && test.correctMarks == 0f && test.totalTimeMinutes == 0) return

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Panel 1 — Questions
        StatBarPanel(
            title = "Questions",
            modifier = Modifier.weight(1f),
            bars = listOf(
                BarData(
                    label = "1M",
                    value = test.attempted1Mark.toFloat(),
                    max = max(1, test.totalQuestions).toFloat(),
                    color = Color(0xFF7B61FF)
                ),
                BarData(
                    label = "2M",
                    value = test.attempted2Mark.toFloat(),
                    max = max(1, test.totalQuestions).toFloat(),
                    color = Color(0xFF9B8DFF)
                ),
                BarData(
                    label = "Skip",
                    value = test.notAttempted.toFloat(),
                    max = max(1, test.totalQuestions).toFloat(),
                    color = Color(0xFFB0B0B0)
                )
            ),
            legend = listOf(
                "1-mark" to Color(0xFF7B61FF),
                "2-mark" to Color(0xFF9B8DFF),
                "Skipped" to Color(0xFFB0B0B0)
            )
        )
        // Panel 2 — Marks
        StatBarPanel(
            title = "Marks",
            modifier = Modifier.weight(1f),
            bars = listOf(
                BarData(
                    label = "✓",
                    value = test.correctMarks,
                    max = max(0.01f, test.totalMarks),
                    color = Color(0xFF22C55E)
                ),
                BarData(
                    label = "−",
                    value = test.penaltyMarks,
                    max = max(0.01f, test.totalMarks),
                    color = Color(0xFFEF4444)
                ),
                BarData(
                    label = "Net",
                    value = test.netMarks.coerceAtLeast(0f),
                    max = max(0.01f, test.totalMarks),
                    color = Color(0xFF4D96FF)
                )
            ),
            legend = listOf(
                "Positive" to Color(0xFF22C55E),
                "Negative" to Color(0xFFEF4444),
                "Net" to Color(0xFF4D96FF)
            )
        )
        // Panel 3 — Time
        if (test.totalTimeMinutes > 0 || test.timeTakenMinutes > 0) {
            StatBarPanel(
                title = "Time (min)",
                modifier = Modifier.weight(1f),
                bars = listOf(
                    BarData(
                        label = "Tot",
                        value = test.totalTimeMinutes.toFloat(),
                        max = max(1, test.totalTimeMinutes).toFloat(),
                        color = Color(0xFF7B61FF)
                    ),
                    BarData(
                        label = "Taken",
                        value = test.timeTakenMinutes.toFloat(),
                        max = max(1, test.totalTimeMinutes).toFloat(),
                        color = Color(0xFFFB923C)
                    )
                ),
                legend = listOf(
                    "Total" to Color(0xFF7B61FF),
                    "Taken" to Color(0xFFFB923C)
                )
            )
        }
    }
}

private data class BarData(val label: String, val value: Float, val max: Float, val color: Color)

@Composable
private fun StatBarPanel(
    title: String,
    bars: List<BarData>,
    legend: List<Pair<String, Color>>,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = androidx.compose.foundation.BorderStroke(
            1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f)
        )
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(8.dp))
            // Bar chart canvas
            Canvas(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(70.dp)
            ) {
                val barCount = bars.size
                val spacing = 6.dp.toPx()
                val barW = (size.width - spacing * (barCount + 1)) / barCount
                val maxH = size.height - 20.dp.toPx()
                val labelPaint = android.graphics.Paint().apply {
                    color = android.graphics.Color.GRAY
                    textSize = 18f
                    textAlign = android.graphics.Paint.Align.CENTER
                }
                bars.forEachIndexed { i, bar ->
                    val left = spacing + i * (barW + spacing)
                    val ratio = (bar.value / bar.max).coerceIn(0f, 1f)
                    val barH = maxH * ratio
                    val top = maxH - barH
                    drawRoundRect(
                        color = bar.color.copy(alpha = 0.2f),
                        topLeft = Offset(left, 0f),
                        size = Size(barW, maxH),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(4.dp.toPx())
                    )
                    if (ratio > 0f) {
                        drawRoundRect(
                            color = bar.color,
                            topLeft = Offset(left, top),
                            size = Size(barW, barH),
                            cornerRadius = androidx.compose.ui.geometry.CornerRadius(4.dp.toPx())
                        )
                    }
                    // x-label
                    drawContext.canvas.nativeCanvas.drawText(
                        bar.label,
                        left + barW / 2,
                        size.height,
                        labelPaint
                    )
                }
            }
            Spacer(Modifier.height(6.dp))
            // Legend
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                legend.forEach { (name, color) ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .clip(CircleShape)
                                .background(color)
                        )
                        Text(
                            text = name,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 9.sp
                        )
                    }
                }
            }
        }
    }
}

// ─── History card ─────────────────────────────────────────────────────────────

@Composable
private fun TestHistoryCard(
    test: MockTest,
    subject: Subject?,
    topic: Topic?,
    onDelete: () -> Unit
) {
    val subjectColor = remember(subject?.colorHex) { parseColor(subject?.colorHex) }
    var expanded by rememberSaveable { mutableStateOf(false) }

    val scoreColor = when {
        test.scorePercentage >= 75f -> Color(0xFF22C55E)
        test.scorePercentage >= 50f -> Color(0xFFEAB308)
        else -> Color(0xFFEF4444)
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = !expanded },
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.20f)
        ),
        border = androidx.compose.foundation.BorderStroke(
            1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.06f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // ── Header row ────────────────────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    // Subject + Topic chips
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(5.dp))
                                .background(subjectColor.copy(alpha = 0.15f))
                                .padding(horizontal = 7.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = subject?.name ?: "Subject",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = subjectColor
                            )
                        }
                        if (topic != null) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(5.dp))
                                    .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.07f))
                                    .padding(horizontal = 7.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = topic.name,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Text(
                            text = test.date,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = test.testName,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = "%.1f / %.1f marks".format(test.obtainedMarks, test.totalMarks),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    // Score badge
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(scoreColor.copy(alpha = 0.12f))
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "${test.scorePercentage.roundToInt()}%",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = scoreColor
                        )
                    }
                    // Expand toggle
                    Icon(
                        imageVector = if (expanded) Icons.Default.KeyboardArrowUp
                        else Icons.Default.KeyboardArrowDown,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            // ── Expandable stats ──────────────────────────────────────────
            AnimatedVisibility(
                visible = expanded,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Column {
                    // 3-panel charts
                    TestResultStatsCard(test = test)

                    // Extra info
                    if (!test.notes.isNullOrBlank()) {
                        Spacer(Modifier.height(10.dp))
                        Text(
                            text = "📝 ${test.notes}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    // Net marks summary
                    if (test.netMarks != 0f || test.correctMarks != 0f) {
                        Spacer(Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            StatPill("✓ Correct", "%.1f".format(test.correctMarks), Color(0xFF22C55E))
                            StatPill("− Penalty", "%.1f".format(test.penaltyMarks), Color(0xFFEF4444))
                            StatPill("= Net", "%.1f".format(test.netMarks), Color(0xFF4D96FF))
                        }
                    }
                    if (test.timeTakenMinutes > 0) {
                        Spacer(Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            StatPill("⏱ Allowed", "${test.totalTimeMinutes} min", Color(0xFF7B61FF))
                            StatPill("🕐 Taken", "${test.timeTakenMinutes} min", Color(0xFFFB923C))
                        }
                    }
                    // Delete button
                    Spacer(Modifier.height(12.dp))
                    TextButton(
                        onClick = onDelete,
                        colors = ButtonDefaults.textButtonColors(
                            contentColor = MaterialTheme.colorScheme.error
                        )
                    ) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(Modifier.width(4.dp))
                        Text("Delete", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }
    }
}

@Composable
private fun StatPill(label: String, value: String, color: Color) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(color.copy(alpha = 0.10f))
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = color
        )
    }
}

// ─── Add dialog ──────────────────────────────────────────────────────────────

data class TestResultArgs(
    val subjectId: Long,
    val topicId: Long?,
    val testName: String,
    val obtainedMarks: Float,
    val totalMarks: Float,
    val notes: String?,
    val date: String,
    val totalQuestions: Int,
    val attempted1Mark: Int,
    val attempted2Mark: Int,
    val notAttempted: Int,
    val correctMarks: Float,
    val penaltyMarks: Float,
    val totalTimeMinutes: Int,
    val timeTakenMinutes: Int
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddMockTestDialog(
    subjects: List<Subject>,
    topics: List<Topic>,
    onDismiss: () -> Unit,
    onSave: (TestResultArgs) -> Unit
) {
    var testName by rememberSaveable { mutableStateOf("") }
    var selectedSubject by remember { mutableStateOf(subjects.first()) }
    var selectedTopic by remember { mutableStateOf<Topic?>(null) }
    var subjectExpanded by remember { mutableStateOf(false) }
    var topicExpanded by remember { mutableStateOf(false) }

    // Questions
    var totalQStr by rememberSaveable { mutableStateOf("") }
    var att1Str by rememberSaveable { mutableStateOf("") }
    var att2Str by rememberSaveable { mutableStateOf("") }
    var notAttStr by rememberSaveable { mutableStateOf("") }

    // Marks
    var correctStr by rememberSaveable { mutableStateOf("") }
    var penaltyStr by rememberSaveable { mutableStateOf("") }
    var totalMarksStr by rememberSaveable { mutableStateOf("") }
    var obtainedStr by rememberSaveable { mutableStateOf("") }

    // Time
    var totalTimeStr by rememberSaveable { mutableStateOf("") }
    var timeTakenStr by rememberSaveable { mutableStateOf("") }

    // Date / notes
    var dateStr by rememberSaveable {
        mutableStateOf(LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE))
    }
    var notesStr by rememberSaveable { mutableStateOf("") }

    // Auto-calc net marks display
    val netMarks = remember(correctStr, penaltyStr) {
        (correctStr.toFloatOrNull() ?: 0f) - (penaltyStr.toFloatOrNull() ?: 0f)
    }

    val topicsForSubject = remember(selectedSubject, topics) {
        topics.filter { it.subjectId == selectedSubject.id }
    }

    // Reset topic when subject changes
    LaunchedEffect(selectedSubject) { selectedTopic = null }

    val canSave = testName.isNotBlank()

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.92f),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                // ── Header ────────────────────────────────────────────────
                Text(
                    text = "Log Test Result",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                // ── Section 1: Subject & Topic ────────────────────────────
                SectionLabel("📚  Subject & Topic")
                // Subject dropdown
                ExposedDropdownMenuBox(
                    expanded = subjectExpanded,
                    onExpandedChange = { subjectExpanded = it }
                ) {
                    OutlinedTextField(
                        value = selectedSubject.name,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Subject") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(subjectExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor()
                    )
                    ExposedDropdownMenu(
                        expanded = subjectExpanded,
                        onDismissRequest = { subjectExpanded = false }
                    ) {
                        subjects.forEach { subject ->
                            DropdownMenuItem(
                                text = { Text(subject.name) },
                                onClick = {
                                    selectedSubject = subject
                                    subjectExpanded = false
                                }
                            )
                        }
                    }
                }
                // Topic dropdown (optional)
                if (topicsForSubject.isNotEmpty()) {
                    ExposedDropdownMenuBox(
                        expanded = topicExpanded,
                        onExpandedChange = { topicExpanded = it }
                    ) {
                        OutlinedTextField(
                            value = selectedTopic?.name ?: "Select topic (optional)",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Topic") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(topicExpanded) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor()
                        )
                        ExposedDropdownMenu(
                            expanded = topicExpanded,
                            onDismissRequest = { topicExpanded = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("— None —") },
                                onClick = { selectedTopic = null; topicExpanded = false }
                            )
                            topicsForSubject.forEach { topic ->
                                DropdownMenuItem(
                                    text = { Text(topic.name) },
                                    onClick = {
                                        selectedTopic = topic
                                        topicExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }

                // ── Section 2: Test Info ──────────────────────────────────
                SectionLabel("📝  Test Details")
                OutlinedTextField(
                    value = testName,
                    onValueChange = { testName = it },
                    label = { Text("Test / Exam Name *") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = dateStr,
                    onValueChange = { dateStr = it },
                    label = { Text("Date (YYYY-MM-DD)") },
                    modifier = Modifier.fillMaxWidth()
                )

                // ── Section 3: Questions ──────────────────────────────────
                SectionLabel("❓  Questions Breakdown")
                OutlinedTextField(
                    value = totalQStr,
                    onValueChange = { totalQStr = it },
                    label = { Text("Total Questions") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth()
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = att1Str,
                        onValueChange = { att1Str = it },
                        label = { Text("1-Mark") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = att2Str,
                        onValueChange = { att2Str = it },
                        label = { Text("2-Mark") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = notAttStr,
                        onValueChange = { notAttStr = it },
                        label = { Text("Skipped") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f)
                    )
                }

                // ── Section 4: Marks ──────────────────────────────────────
                SectionLabel("🎯  Marks Breakdown")
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = totalMarksStr,
                        onValueChange = { totalMarksStr = it },
                        label = { Text("Total Marks") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = obtainedStr,
                        onValueChange = { obtainedStr = it },
                        label = { Text("Obtained") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = correctStr,
                        onValueChange = { correctStr = it },
                        label = { Text("Correct (+)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = penaltyStr,
                        onValueChange = { penaltyStr = it },
                        label = { Text("Penalty (−)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f)
                    )
                }
                // Auto-calculated net
                if (correctStr.isNotBlank() || penaltyStr.isNotBlank()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(
                                if (netMarks >= 0) Color(0xFF22C55E).copy(alpha = 0.10f)
                                else Color(0xFFEF4444).copy(alpha = 0.10f)
                            )
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            "Net Marks (auto)",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            "%.2f".format(netMarks),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (netMarks >= 0) Color(0xFF22C55E) else Color(0xFFEF4444)
                        )
                    }
                }

                // ── Section 5: Time ───────────────────────────────────────
                SectionLabel("⏱  Time (minutes)")
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = totalTimeStr,
                        onValueChange = { totalTimeStr = it },
                        label = { Text("Total Allowed") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = timeTakenStr,
                        onValueChange = { timeTakenStr = it },
                        label = { Text("Time Taken") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f)
                    )
                }

                // ── Section 6: Notes ─────────────────────────────────────
                SectionLabel("💬  Notes (optional)")
                OutlinedTextField(
                    value = notesStr,
                    onValueChange = { notesStr = it },
                    label = { Text("Notes") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 3
                )

                // ── Buttons ───────────────────────────────────────────────
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.End)
                ) {
                    OutlinedButton(onClick = onDismiss) { Text("Cancel") }
                    Button(
                        onClick = {
                            if (canSave) {
                                val obtained = obtainedStr.toFloatOrNull() ?: 0f
                                val total = totalMarksStr.toFloatOrNull() ?: 100f
                                val correct = correctStr.toFloatOrNull() ?: 0f
                                val penalty = penaltyStr.toFloatOrNull() ?: 0f
                                onSave(
                                    TestResultArgs(
                                        subjectId = selectedSubject.id,
                                        topicId = selectedTopic?.id,
                                        testName = testName.trim(),
                                        obtainedMarks = obtained,
                                        totalMarks = total,
                                        notes = notesStr.ifBlank { null },
                                        date = dateStr,
                                        totalQuestions = totalQStr.toIntOrNull() ?: 0,
                                        attempted1Mark = att1Str.toIntOrNull() ?: 0,
                                        attempted2Mark = att2Str.toIntOrNull() ?: 0,
                                        notAttempted = notAttStr.toIntOrNull() ?: 0,
                                        correctMarks = correct,
                                        penaltyMarks = penalty,
                                        totalTimeMinutes = totalTimeStr.toIntOrNull() ?: 0,
                                        timeTakenMinutes = timeTakenStr.toIntOrNull() ?: 0
                                    )
                                )
                            }
                        },
                        enabled = canSave,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Save Result")
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.primary
    )
    HorizontalDivider(
        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f),
        thickness = 1.dp
    )
}
