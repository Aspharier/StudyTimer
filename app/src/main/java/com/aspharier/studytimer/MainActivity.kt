package com.aspharier.studytimer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.aspharier.studytimer.ui.navigation.Screen
import com.aspharier.studytimer.ui.navigation.StudyTimerNavHost
import com.aspharier.studytimer.ui.theme.AppTheme
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
            
            var selectedTheme by rememberSaveable {
                mutableStateOf(
                    runCatching {
                        AppTheme.valueOf(
                            preferences.getString("app_theme", AppTheme.Midnight.name)
                                ?: AppTheme.Midnight.name
                        )
                    }.getOrDefault(AppTheme.Midnight)
                )
            }

            StudyTimerTheme(appTheme = selectedTheme) {
                Surface(modifier = Modifier.fillMaxSize()) {
                    StudyTimerNavHost(
                        startDestination = if (hasCompletedOnboarding) Screen.Home.route else Screen.Onboarding.route,
                        selectedTheme = selectedTheme,
                        onThemeSelected = { theme ->
                            selectedTheme = theme
                            preferences.edit().putString("app_theme", theme.name).apply()
                        }
                    )
                }
            }
        }
    }
}
