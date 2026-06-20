package com.aspharier.studytimer.data.repository

import com.aspharier.studytimer.data.local.dao.ExamGoalDao
import com.aspharier.studytimer.data.local.entity.ExamGoalEntity
import com.aspharier.studytimer.domain.model.ExamGoal
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ExamGoalRepository @Inject constructor(
    private val examGoalDao: ExamGoalDao
) {
    suspend fun insertExamGoal(examGoal: ExamGoal): Long {
        return examGoalDao.insert(examGoal.toEntity())
    }

    suspend fun updateExamGoal(examGoal: ExamGoal) {
        examGoalDao.update(examGoal.toEntity())
    }

    suspend fun deleteExamGoal(id: Long) {
        examGoalDao.deleteById(id)
    }

    fun getActiveExamGoal(): Flow<ExamGoal?> {
        return examGoalDao.getActiveExamGoal().map { it?.toModel() }
    }

    fun getAllExamGoals(): Flow<List<ExamGoal>> {
        return examGoalDao.getAllExamGoals().map { entities ->
            entities.map { it.toModel() }
        }
    }

    suspend fun getExamGoalById(id: Long): ExamGoal? {
        return examGoalDao.getExamGoalById(id)?.toModel()
    }

    suspend fun setActiveExamGoal(id: Long) {
        examGoalDao.deactivateAll()
        examGoalDao.activate(id)
    }

    private fun ExamGoal.toEntity() = ExamGoalEntity(
        id = id,
        name = name,
        examDate = examDate,
        dailyTargetMinutes = dailyTargetMinutes,
        createdAt = createdAt,
        isActive = isActive
    )

    private fun ExamGoalEntity.toModel() = ExamGoal(
        id = id,
        name = name,
        examDate = examDate,
        dailyTargetMinutes = dailyTargetMinutes,
        createdAt = createdAt,
        isActive = isActive
    )
}
