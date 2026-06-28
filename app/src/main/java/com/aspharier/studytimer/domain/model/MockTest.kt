package com.aspharier.studytimer.domain.model

data class MockTest(
    val id: Long = 0,
    val examGoalId: Long,
    val subjectId: Long,
    val topicId: Long? = null,
    val testName: String,
    val scorePercentage: Float,
    val totalMarks: Float,
    val obtainedMarks: Float,
    val notes: String? = null,
    val date: String,
    val createdAt: Long = System.currentTimeMillis(),
    // Questions breakdown
    val totalQuestions: Int = 0,
    val attempted1Mark: Int = 0,
    val attempted2Mark: Int = 0,
    val notAttempted: Int = 0,
    // Marks breakdown
    val correctMarks: Float = 0f,
    val penaltyMarks: Float = 0f,
    val netMarks: Float = 0f,
    // Time tracking (minutes)
    val totalTimeMinutes: Int = 0,
    val timeTakenMinutes: Int = 0
)
