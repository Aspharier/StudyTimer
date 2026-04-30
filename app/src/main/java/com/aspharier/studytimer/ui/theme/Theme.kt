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
    Paper("Paper", Color(0xFFB45309)),
    Sakura("Sakura", Color(0xFFE11D48)),
    Aurora("Aurora", Color(0xFFA78BFA)),
    Ember("Ember", Color(0xFFF97316)),
    Lavender("Lavender", Color(0xFF7C3AED)),
    Mint("Mint", Color(0xFF0F766E))
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

private val SakuraColorScheme = lightColorScheme(
    primary = Color(0xFFE11D48),
    onPrimary = Color.White,
    secondary = Color(0xFFBE185D),
    onSecondary = Color.White,
    tertiary = Color(0xFF0891B2),
    onTertiary = Color.White,
    background = Color(0xFFFFF7F8),
    onBackground = Color(0xFF241115),
    surface = Color(0xFFFFE7EC),
    onSurface = Color(0xFF241115),
    surfaceVariant = Color(0xFFF8C8D3),
    onSurfaceVariant = Color(0xFF72515A),
    error = Color(0xFFB91C1C),
    onError = Color.White,
    primaryContainer = Color(0xFFFFD9E1),
    onPrimaryContainer = Color(0xFF881337)
)

private val AuroraColorScheme = darkColorScheme(
    primary = Color(0xFFA78BFA),
    onPrimary = Color(0xFF21113D),
    secondary = Color(0xFF22D3EE),
    onSecondary = Color(0xFF061D25),
    tertiary = Color(0xFF34D399),
    onTertiary = Color(0xFF052E1F),
    background = Color(0xFF0B0A1F),
    onBackground = Color(0xFFF3F0FF),
    surface = Color(0xFF17142F),
    onSurface = Color(0xFFF3F0FF),
    surfaceVariant = Color(0xFF27214A),
    onSurfaceVariant = Color(0xFFC9C1EA),
    error = Color(0xFFFF8A8A),
    onError = Color(0xFF1E0505),
    primaryContainer = Color(0x3322D3EE),
    onPrimaryContainer = Color(0xFFC4B5FD)
)

private val EmberColorScheme = darkColorScheme(
    primary = Color(0xFFF97316),
    onPrimary = Color(0xFF2A1203),
    secondary = Color(0xFFFACC15),
    onSecondary = Color(0xFF302500),
    tertiary = Color(0xFFFB7185),
    onTertiary = Color(0xFF3A0711),
    background = Color(0xFF160A05),
    onBackground = Color(0xFFFFF1E8),
    surface = Color(0xFF24100A),
    onSurface = Color(0xFFFFF1E8),
    surfaceVariant = Color(0xFF3B1D12),
    onSurfaceVariant = Color(0xFFE7BCA3),
    error = Color(0xFFFF8A8A),
    onError = Color(0xFF1E0505),
    primaryContainer = Color(0x33FB923C),
    onPrimaryContainer = Color(0xFFFED7AA)
)

private val LavenderColorScheme = lightColorScheme(
    primary = Color(0xFF7C3AED),
    onPrimary = Color.White,
    secondary = Color(0xFFDB2777),
    onSecondary = Color.White,
    tertiary = Color(0xFF0EA5E9),
    onTertiary = Color.White,
    background = Color(0xFFFCF8FF),
    onBackground = Color(0xFF1D1527),
    surface = Color(0xFFF1E7FF),
    onSurface = Color(0xFF1D1527),
    surfaceVariant = Color(0xFFE1D2F4),
    onSurfaceVariant = Color(0xFF62536F),
    error = Color(0xFFB91C1C),
    onError = Color.White,
    primaryContainer = Color(0xFFEDE1FF),
    onPrimaryContainer = Color(0xFF4C1D95)
)

private val MintColorScheme = lightColorScheme(
    primary = Color(0xFF0F766E),
    onPrimary = Color.White,
    secondary = Color(0xFF65A30D),
    onSecondary = Color.White,
    tertiary = Color(0xFF2563EB),
    onTertiary = Color.White,
    background = Color(0xFFF4FFFC),
    onBackground = Color(0xFF10211E),
    surface = Color(0xFFE4F8F2),
    onSurface = Color(0xFF10211E),
    surfaceVariant = Color(0xFFC8E8DF),
    onSurfaceVariant = Color(0xFF4D6860),
    error = Color(0xFFB91C1C),
    onError = Color.White,
    primaryContainer = Color(0xFFCCFBF1),
    onPrimaryContainer = Color(0xFF134E4A)
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
        AppTheme.Sakura -> SakuraColorScheme
        AppTheme.Aurora -> AuroraColorScheme
        AppTheme.Ember -> EmberColorScheme
        AppTheme.Lavender -> LavenderColorScheme
        AppTheme.Mint -> MintColorScheme
    }
    val useLightSystemBars = appTheme in setOf(
        AppTheme.Paper,
        AppTheme.Sakura,
        AppTheme.Lavender,
        AppTheme.Mint
    )

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
