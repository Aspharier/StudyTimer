package com.aspharier.studytimer.data.repository

import com.aspharier.studytimer.data.local.dao.StudySessionDao
import com.aspharier.studytimer.domain.model.DailySessions
import com.aspharier.studytimer.domain.model.StudySession
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StudySessionRepository @Inject constructor(
    private val studySessionDao: StudySessionDao
) {
    suspend fun insertSession(session: StudySession): Long {
        return studySessionDao.insert(session.toEntity())
    }

    suspend fun updateSession(session: StudySession) {
        studySessionDao.update(session.toEntity())
    }

    suspend fun deleteSession(sessionId: Long) {
        studySessionDao.deleteById(sessionId)
    }

    fun getSessionsByDate(date: String): Flow<List<StudySession>> {
        return studySessionDao.getSessionsByDate(date).map { entities ->
            entities.map { it.toModel() }
        }
    }

    fun getAllSessions(): Flow<List<StudySession>> {
        return studySessionDao.getAllSessions().map { entities ->
            entities.map { it.toModel() }
        }
    }

    fun getAllDates(): Flow<List<String>> {
        return studySessionDao.getAllDates()
    }

    fun getDailySessions(date: String): Flow<DailySessions> {
        return studySessionDao.getSessionsByDate(date).map { entities ->
            val sessions = entities.map { it.toModel() }
            val totalSeconds = sessions.sumOf { it.completedDurationSeconds }
            DailySessions(
                date = date,
                sessions = sessions,
                totalMinutes = (totalSeconds / 60).toInt()
            )
        }
    }

    suspend fun getSessionById(id: Long): StudySession? {
        return studySessionDao.getSessionById(id)?.toModel()
    }

    fun getTotalSecondsForDate(date: String): Flow<Long> {
        return studySessionDao.getTotalSecondsForDate(date).map { it ?: 0L }
    }

    fun getSessionsBySubjectId(subjectId: Long): Flow<List<StudySession>> {
        return studySessionDao.getSessionsBySubjectId(subjectId).map { entities ->
            entities.map { it.toModel() }
        }
    }
}
