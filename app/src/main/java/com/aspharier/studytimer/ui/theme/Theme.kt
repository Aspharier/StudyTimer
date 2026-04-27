package com.aspharier.studytimer.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

enum class AppTheme(
    val title: String,
    val previewColor: Color
) {
    Midnight("Midnight", Color(0xFF00D9A5)),
    Ocean("Ocean", Color(0xFF7DD3FC)),
    Forest("Forest", Color(0xFF86EFAC)),
    Paper("Paper", Color(0xFFB45309))
}

private val MidnightColorScheme = darkColorScheme(
    primary = Primary,
    onPrimary = OnPrimary,
    secondary = Secondary,
    onSecondary = OnSecondary,
    tertiary = Tertiary,
    onTertiary = OnTertiary,
    background = Background,
    onBackground = OnBackground,
    surface = Surface,
    onSurface = OnSurface,
    surfaceVariant = SurfaceVariant,
    onSurfaceVariant = OnSurfaceVariant,
    error = Error,
    onError = OnError,
    primaryContainer = AccentDim,
    onPrimaryContainer = Accent
)

private val OceanColorScheme = darkColorScheme(
    primary = Color(0xFF7DD3FC),
    onPrimary = Color(0xFF06111F),
    secondary = Color(0xFFA5B4FC),
    onSecondary = Color(0xFF101525),
    tertiary = Color(0xFF2DD4BF),
    onTertiary = Color(0xFF031615),
    background = Color(0xFF06111F),
    onBackground = Color(0xFFEAF6FF),
    surface = Color(0xFF0D1B2A),
    onSurface = Color(0xFFEAF6FF),
    surfaceVariant = Color(0xFF16324A),
    onSurfaceVariant = Color(0xFFB7C9D8),
    error = Color(0xFFFF8A8A),
    onError = Color(0xFF1E0505),
    primaryContainer = Color(0x3328BDF8),
    onPrimaryContainer = Color(0xFFBAE6FD)
)

private val ForestColorScheme = darkColorScheme(
    primary = Color(0xFF86EFAC),
    onPrimary = Color(0xFF052E16),
    secondary = Color(0xFFFDE68A),
    onSecondary = Color(0xFF3D2B00),
    tertiary = Color(0xFF67E8F9),
    onTertiary = Color(0xFF083344),
    background = Color(0xFF07140D),
    onBackground = Color(0xFFEAF7ED),
    surface = Color(0xFF0E2015),
    onSurface = Color(0xFFEAF7ED),
    surfaceVariant = Color(0xFF193723),
    onSurfaceVariant = Color(0xFFB8D4C0),
    error = Color(0xFFFF8A8A),
    onError = Color(0xFF1E0505),
    primaryContainer = Color(0x3334D399),
    onPrimaryContainer = Color(0xFFBBF7D0)
)

private val PaperColorScheme = lightColorScheme(
    primary = Color(0xFFB45309),
    onPrimary = Color.White,
    secondary = Color(0xFF2563EB),
    onSecondary = Color.White,
    tertiary = Color(0xFF047857),
    onTertiary = Color.White,
    background = Color(0xFFFFFBF5),
    onBackground = Color(0xFF1F1A14),
    surface = Color(0xFFFFF4E6),
    onSurface = Color(0xFF1F1A14),
    surfaceVariant = Color(0xFFF1E1CF),
    onSurfaceVariant = Color(0xFF6B5E52),
    error = Color(0xFFB91C1C),
    onError = Color.White,
    primaryContainer = Color(0xFFFFEDD5),
    onPrimaryContainer = Color(0xFF7C2D12)
)

@Composable
fun StudyTimerTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    appTheme: AppTheme = AppTheme.Midnight,
    content: @Composable () -> Unit
) {
    val colorScheme = when (appTheme) {
        AppTheme.Midnight -> MidnightColorScheme
        AppTheme.Ocean -> OceanColorScheme
        AppTheme.Forest -> ForestColorScheme
        AppTheme.Paper -> PaperColorScheme
    }
    val useLightSystemBars = appTheme == AppTheme.Paper

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            window.navigationBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = useLightSystemBars
            WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = useLightSystemBars
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
