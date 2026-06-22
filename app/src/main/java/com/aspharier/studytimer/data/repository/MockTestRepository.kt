package com.aspharier.studytimer.data.repository

import android.content.Context
import com.aspharier.studytimer.data.local.dao.MockTestDao
import com.aspharier.studytimer.data.local.entity.MockTestEntity
import com.aspharier.studytimer.domain.model.MockTest
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MockTestRepository @Inject constructor(
    private val mockTestDao: MockTestDao,
    @ApplicationContext private val context: Context
) {
    private val preferences = context.getSharedPreferences("sync_prefs", Context.MODE_PRIVATE)

    suspend fun insertMockTest(mockTest: MockTest): Long {
        return mockTestDao.insert(mockTest.toEntity())
    }

    suspend fun deleteMockTest(id: Long) {
        mockTestDao.deleteById(id)
        val deleted = preferences.getStringSet("deleted_mock_test_ids", emptySet()) ?: emptySet()
        val updated = deleted + id.toString()
        preferences.edit().putStringSet("deleted_mock_test_ids", updated).apply()
    }

    suspend fun deleteMockTestFromSync(id: Long) {
        mockTestDao.deleteById(id)
    }

    fun getMockTestsForGoal(examGoalId: Long): Flow<List<MockTest>> {
        return mockTestDao.getMockTestsForGoal(examGoalId).map { entities ->
            entities.map { it.toModel() }
        }
    }

    fun getAverageScoreForSubject(subjectId: Long): Flow<Float?> {
        return mockTestDao.getAverageScoreForSubject(subjectId)
    }

    fun getAllMockTests(): Flow<List<MockTest>> {
        return mockTestDao.getAllMockTests().map { entities ->
            entities.map { it.toModel() }
        }
    }

    private fun MockTest.toEntity() = MockTestEntity(
        id = id,
        examGoalId = examGoalId,
        subjectId = subjectId,
        testName = testName,
        scorePercentage = scorePercentage,
        totalMarks = totalMarks,
        obtainedMarks = obtainedMarks,
        notes = notes,
        date = date,
        createdAt = createdAt
    )

    private fun MockTestEntity.toModel() = MockTest(
        id = id,
        examGoalId = examGoalId,
        subjectId = subjectId,
        testName = testName,
        scorePercentage = scorePercentage,
        totalMarks = totalMarks,
        obtainedMarks = obtainedMarks,
        notes = notes,
        date = date,
        createdAt = createdAt
    )
}
