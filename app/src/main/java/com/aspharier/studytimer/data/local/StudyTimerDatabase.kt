package com.aspharier.studytimer.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.aspharier.studytimer.data.local.dao.ExamGoalDao
import com.aspharier.studytimer.data.local.dao.StudySessionDao
import com.aspharier.studytimer.data.local.dao.SubjectDao
import com.aspharier.studytimer.data.local.dao.TopicDao
import com.aspharier.studytimer.data.local.dao.MockTestDao
import com.aspharier.studytimer.data.local.entity.ExamGoalEntity
import com.aspharier.studytimer.data.local.entity.StudySessionEntity
import com.aspharier.studytimer.data.local.entity.SubjectEntity
import com.aspharier.studytimer.data.local.entity.TopicEntity
import com.aspharier.studytimer.data.local.entity.MockTestEntity

@Database(
    entities = [
        StudySessionEntity::class,
        ExamGoalEntity::class,
        SubjectEntity::class,
        TopicEntity::class,
        MockTestEntity::class
    ],
    version = 6,
    exportSchema = false
)
abstract class StudyTimerDatabase : RoomDatabase() {
    abstract fun studySessionDao(): StudySessionDao
    abstract fun examGoalDao(): ExamGoalDao
    abstract fun subjectDao(): SubjectDao
    abstract fun topicDao(): TopicDao
    abstract fun mockTestDao(): MockTestDao

    companion object {
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Add new columns to study_sessions
                db.execSQL("ALTER TABLE study_sessions ADD COLUMN notes TEXT DEFAULT NULL")
                db.execSQL("ALTER TABLE study_sessions ADD COLUMN tag TEXT DEFAULT NULL")
                db.execSQL("ALTER TABLE study_sessions ADD COLUMN subjectId INTEGER DEFAULT NULL")

                // Create exam_goals table
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS exam_goals (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        name TEXT NOT NULL,
                        examDate TEXT NOT NULL,
                        dailyTargetMinutes INTEGER NOT NULL DEFAULT 360,
                        createdAt INTEGER NOT NULL,
                        isActive INTEGER NOT NULL DEFAULT 1
                    )
                """.trimIndent())

                // Create subjects table
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS subjects (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        name TEXT NOT NULL,
                        examGoalId INTEGER NOT NULL,
                        colorHex TEXT NOT NULL DEFAULT '#4D96FF',
                        sortOrder INTEGER NOT NULL DEFAULT 0,
                        FOREIGN KEY (examGoalId) REFERENCES exam_goals(id) ON DELETE CASCADE
                    )
                """.trimIndent())
                db.execSQL("CREATE INDEX IF NOT EXISTS index_subjects_examGoalId ON subjects(examGoalId)")

                // Create topics table
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS topics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        name TEXT NOT NULL,
                        subjectId INTEGER NOT NULL,
                        status TEXT NOT NULL DEFAULT 'NOT_STARTED',
                        sortOrder INTEGER NOT NULL DEFAULT 0,
                        FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE
                    )
                """.trimIndent())
                db.execSQL("CREATE INDEX IF NOT EXISTS index_topics_subjectId ON topics(subjectId)")
            }
        }

        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE topics ADD COLUMN subTopicsJson TEXT DEFAULT NULL")
            }
        }

        val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS mock_tests (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        examGoalId INTEGER NOT NULL,
                        subjectId INTEGER NOT NULL,
                        testName TEXT NOT NULL,
                        scorePercentage REAL NOT NULL,
                        totalMarks REAL NOT NULL,
                        obtainedMarks REAL NOT NULL,
                        notes TEXT DEFAULT NULL,
                        date TEXT NOT NULL,
                        createdAt INTEGER NOT NULL,
                        FOREIGN KEY (examGoalId) REFERENCES exam_goals(id) ON DELETE CASCADE,
                        FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE
                    )
                """.trimIndent())
                db.execSQL("CREATE INDEX IF NOT EXISTS index_mock_tests_subjectId ON mock_tests(subjectId)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_mock_tests_examGoalId ON mock_tests(examGoalId)")
            }
        }

        val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE subjects ADD COLUMN targetHours INTEGER DEFAULT NULL")
                db.execSQL("ALTER TABLE subjects ADD COLUMN priority TEXT NOT NULL DEFAULT 'MEDIUM'")
            }
        }

        val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // SQLite doesn't support adding foreign key constraints or modifying column default constraints via ALTER TABLE.
                // We recreate the mock_tests table with the correct schema, copy the data, drop the old table, and recreate indices.
                
                // 1. Rename existing table
                db.execSQL("ALTER TABLE mock_tests RENAME TO mock_tests_old")
                
                // 2. Create the new table matching expected Room schema (no default values on the new columns)
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS mock_tests (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        examGoalId INTEGER NOT NULL,
                        subjectId INTEGER NOT NULL,
                        topicId INTEGER,
                        testName TEXT NOT NULL,
                        scorePercentage REAL NOT NULL,
                        totalMarks REAL NOT NULL,
                        obtainedMarks REAL NOT NULL,
                        notes TEXT,
                        date TEXT NOT NULL,
                        createdAt INTEGER NOT NULL,
                        totalQuestions INTEGER NOT NULL,
                        attempted1Mark INTEGER NOT NULL,
                        attempted2Mark INTEGER NOT NULL,
                        notAttempted INTEGER NOT NULL,
                        correctMarks REAL NOT NULL,
                        penaltyMarks REAL NOT NULL,
                        netMarks REAL NOT NULL,
                        totalTimeMinutes INTEGER NOT NULL,
                        timeTakenMinutes INTEGER NOT NULL,
                        FOREIGN KEY(subjectId) REFERENCES subjects(id) ON DELETE CASCADE,
                        FOREIGN KEY(examGoalId) REFERENCES exam_goals(id) ON DELETE CASCADE,
                        FOREIGN KEY(topicId) REFERENCES topics(id) ON DELETE SET NULL
                    )
                """.trimIndent())
                
                // 3. Copy data from old table to new table, setting defaults for new columns
                db.execSQL("""
                    INSERT INTO mock_tests (
                        id, examGoalId, subjectId, topicId, testName, scorePercentage,
                        totalMarks, obtainedMarks, notes, date, createdAt,
                        totalQuestions, attempted1Mark, attempted2Mark, notAttempted,
                        correctMarks, penaltyMarks, netMarks, totalTimeMinutes, timeTakenMinutes
                    )
                    SELECT
                        id, examGoalId, subjectId, NULL, testName, scorePercentage,
                        totalMarks, obtainedMarks, notes, date, createdAt,
                        0, 0, 0, 0, 0.0, 0.0, 0.0, 0, 0
                    FROM mock_tests_old
                """.trimIndent())
                
                // 4. Drop the old table
                db.execSQL("DROP TABLE mock_tests_old")
                
                // 5. Recreate indices
                db.execSQL("CREATE INDEX IF NOT EXISTS index_mock_tests_subjectId ON mock_tests(subjectId)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_mock_tests_examGoalId ON mock_tests(examGoalId)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_mock_tests_topicId ON mock_tests(topicId)")
            }
        }
    }
}