package com.aspharier.studytimer.domain.model

data class MockTest(
    val id: Long = 0,
    val examGoalId: Long,
    val subjectId: Long,
    val testName: String,
    val scorePercentage: Float,
    val totalMarks: Float,
    val obtainedMarks: Float,
    val notes: String? = null,
    val date: String,
    val createdAt: Long = System.currentTimeMillis()
)
