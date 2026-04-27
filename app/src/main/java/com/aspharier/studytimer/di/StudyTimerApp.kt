package com.aspharier.studytimer.di

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class StudyTimerApp : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                TIMER_CHANNEL_ID,
                "Timer Notifications",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows timer progress"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)

            val finishedChannel = NotificationChannel(
                FINISHED_CHANNEL_ID,
                "Timer Finished",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifies when timer is finished"
                enableVibration(true)
            }

            notificationManager.createNotificationChannel(finishedChannel)
        }
    }

    companion object {
        const val TIMER_CHANNEL_ID = "timer_channel"
        const val FINISHED_CHANNEL_ID = "finished_channel"
    }
}