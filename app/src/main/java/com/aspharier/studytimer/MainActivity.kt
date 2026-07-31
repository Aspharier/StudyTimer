package com.aspharier.studytimer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import com.aspharier.studytimer.ui.components.FloatingStickersBackground
import com.aspharier.studytimer.ui.navigation.Screen
import com.aspharier.studytimer.ui.navigation.StudyTimerNavHost
import com.aspharier.studytimer.ui.theme.StudyTimerTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val preferences = remember { getSharedPreferences("settings", MODE_PRIVATE) }
            val hasCompletedOnboarding = remember {
                preferences.getBoolean("has_completed_onboarding", false)
            }

            StudyTimerTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    FloatingStickersBackground {
                        StudyTimerNavHost(
                            startDestination = if (hasCompletedOnboarding) Screen.Dashboard.route else Screen.Onboarding.route
                        )
                    }
                }
            }
        }
    }
}
