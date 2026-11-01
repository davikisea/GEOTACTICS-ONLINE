---
name: retro-futurism
description: Web and App implementation guide for Retro Futurism. Trigger when user wants vintage future concepts, 1950s space age aesthetics, or atompunk vibes.
date_added: "2026-06-17"
risk: safe
source: self
source_type: self
---

# Retro Futurism

> "The future as imagined in the 1950s and 60s. Rockets, atoms, and sleek, aerodynamic chrome."

## When to Use
Use this sub-style when the user's request matches the aesthetic described above. This is a child reference of the `design-it` skill and is not meant to be triggered directly.

## Core Principles
1. **Aerodynamic Shapes**: Lots of sweeping curves, teardrop shapes, and swooping lines. Nothing is a perfect square.
2. **Space-Age Motifs**: Stars, atoms, orbits, and fins (like a 1950s Cadillac).
3. **Mid-Century Colors mixed with Chrome**: Classic 50s pastels paired with shiny, reflective metals.

## Visual DNA
- **Colors**: Very Dark Grey (`#2B2C24`), Dark Olive (`#46521F`), Muted Green (`#7B8A4A`), Rust Orange (`#C46A3A`), and Cream (`#F2E8D5`).
- **Typography**: Googie architecture fonts, bold cursive scripts, or clean mid-century geometric sans-serifs (like `Futura`).
- **Styling**: Sleek bezels, dramatic drop shadows, and offset overlapping shapes.

## Web Implementation
- **CSS Example**:
```css
body {
  background-color: #2B2C24; /* Dark theme base */
  color: #F2E8D5; /* Cream text */
  font-family: 'Futura', 'Trebuchet MS', sans-serif;
  overflow-x: hidden;
}

/* Googie-style sweeping background element */
.retro-future-swoop {
  position: absolute;
  top: 0; right: -10%;
  width: 120%; height: 300px;
  background-color: #7B8A4A; /* Muted Green */
  border-radius: 0 0 50% 50%;
  transform: rotate(-5deg);
  z-index: -1;
  border-bottom: 8px solid #C46A3A; /* Rust Orange stripe */
}

.atompunk-card {
  background-color: #46521F; /* Dark Olive card */
  border: 4px solid #7B8A4A; /* Muted Green border */
  border-radius: 40px 10px 40px 10px; /* Sweeping, aerodynamic corners */
  padding: 32px;
  box-shadow: 15px 15px 0px rgba(0,0,0,0.5); /* Darker shadow for dark theme */
  position: relative;
}

/* Classic starburst motif */
.starburst {
  position: absolute;
  top: -20px; left: -20px;
  width: 40px; height: 40px;
  background-color: #C46A3A; /* Rust Orange */
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}
App Implementation
SwiftUI
Swift
struct AtompunkShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        // Sweeping aerodynamic curves (large radius top-left, bottom-right)
        path.addRoundedRect(
            in: rect,
            cornerSize: CGSize(width: 40, height: 40),
            style: .continuous
        )
        // To be perfectly authentic, use Path to draw teardrop curves
        return path
    }
}

struct RetroFutureCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("ATOMPUNK")
                .font(.custom("Futura", size: 28))
                .fontWeight(.bold)
                .foregroundColor(Color(red: 0.95, green: 0.91, blue: 0.84)) // #F2E8D5
            
            Text("Sleek chrome and sweeping curves.")
                .font(.custom("Futura", size: 16))
                .foregroundColor(Color(red: 0.95, green: 0.91, blue: 0.84))
        }
        .padding(32)
        .background(Color(red: 0.27, green: 0.32, blue: 0.12)) // #46521F
        // Asymmetric corners: large top-left/bottom-right, small top-right/bottom-left
        .clipShape(UnevenRoundedRectangle(
            topLeadingRadius: 40, bottomLeadingRadius: 10,
            bottomTrailingRadius: 40, topTrailingRadius: 10
        )) // iOS 17+; use a tested custom Shape for older targets
        .overlay(
            // Chrome-like border adapted to palette
            RoundedRectangle(cornerRadius: 10) // Simplified overlay for demo
                .stroke(
                    LinearGradient(colors: [Color(red: 0.48, green: 0.54, blue: 0.29), Color(red: 0.95, green: 0.91, blue: 0.84), Color(red: 0.48, green: 0.54, blue: 0.29)], startPoint: .top, endPoint: .bottom), // #7B8A4A to #F2E8D5
                    lineWidth: 4
                )
        )
        .shadow(color: .black.opacity(0.3), radius: 0, x: 15, y: 15)
    }
}
// UnevenRoundedRectangle supplies asymmetric corners on supported SwiftUI targets.
Rely on asymmetrical corner radii to create the aerodynamic, teardrop aesthetic.

Metallic/Chrome borders are faked by using a LinearGradient of grays and whites.

Flutter
Dart
class RetroFutureCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: const Color(0xFF46521F), // #46521F
        // Asymmetric "aerodynamic" shape
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(40),
          bottomRight: Radius.circular(40),
          topRight: Radius.circular(10),
          bottomLeft: Radius.circular(10),
        ),
        // Chrome border simulation
        border: Border.all(
          width: 4,
          color: const Color(0xFF7B8A4A), // #7B8A4A
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.5),
            offset: const Offset(15, 15),
            blurRadius: 0, // Hard shadow
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: const [
          Text('ATOMPUNK',
            style: TextStyle(fontFamily: 'Futura', fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFFF2E8D5))),
          SizedBox(height: 16),
          Text('Sleek chrome and sweeping curves.',
            style: TextStyle(fontFamily: 'Futura', fontSize: 16, color: Color(0xFFF2E8D5))),
        ],
      ),
    );
  }
}
Flutter handles asymmetric corners natively via BorderRadius.only().

Gradient borders (for chrome) require a CustomPaint or wrapping the container in another container with a gradient background and padding.

React Native
JavaScript
const RetroFutureCard = () => {
  return (
    <View '#000', '#46521F', '#7B8A4A', // 0, 0.5, 10, 15 15, 32, 4, 40, 5, Asymmetric Green Muted Offset aerodynamic backgroundColor: borderBottomLeftRadius: borderBottomRightRadius: borderColor: borderTopLeftRadius: borderTopRightRadius: borderWidth: chrome corners elevation: fallback for hard height: padding: shadow shadowColor: shadowOffset: shadowOpacity: shadowRadius: style="{{" width: { }, }}>
      <Text '#F2E8D5' 'Futura', 'bold', 28, color: fontFamily: fontSize: fontWeight: style="{{" }}>
        ATOMPUNK
      </Text>
      <Text '#F2E8D5' 'Futura', 16, color: fontFamily: fontSize: marginTop: style="{{" }}>
        Sleek chrome and sweeping curves.
      </Text>
    </View>
  );
};
React Native natively supports borderTopLeftRadius style independent props, making the aerodynamic shapes trivial.

Complex geometric backgrounds (like starbursts) should definitely be SVG components imported via react-native-svg.

Jetpack Compose
Kotlin
@Composable
fun RetroFutureCard() {
    Box(
        modifier = Modifier
            .padding(24.dp)
            // Fake hard shadow
            .drawBehind {
                drawRoundRect(
                    color = Color.Black.copy(alpha = 0.5f),
                    topLeft = Offset(15.dp.toPx(), 15.dp.toPx()),
                    size = size,
                    cornerRadius = CornerRadius(40.dp.toPx(), 10.dp.toPx()) // Simplification
                )
            }
            .background(
                color = Color(0xFF46521F), // #46521F
                // Aerodynamic asymmetric corners
                shape = RoundedCornerShape(
                    topStart = 40.dp,
                    topEnd = 10.dp,
                    bottomEnd = 40.dp,
                    bottomStart = 10.dp
                )
            )
            .border(
                width = 4.dp,
                brush = Brush.verticalGradient(listOf(Color(0xFF7B8A4A), Color(0xFFF2E8D5), Color(0xFF7B8A4A))),
                shape = RoundedCornerShape(
                    topStart = 40.dp,
                    topEnd = 10.dp,
                    bottomEnd = 40.dp,
                    bottomStart = 10.dp
                )
            )
            .padding(32.dp)
    ) {
        Column {
            Text("ATOMPUNK",
                fontFamily = FontFamily.SansSerif, // Replace with Futura
                fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF2E8D5))
            Spacer(Modifier.height(16.dp))
            Text("Sleek chrome and sweeping curves.", fontSize = 16.sp, color = Color(0xFFF2E8D5))
        }
    }
}
Use RoundedCornerShape(topStart, topEnd, bottomEnd, bottomStart) to create the atompunk aesthetic.

The Modifier.border takes a Brush natively, making the metallic chrome gradient incredibly easy to achieve compared to other frameworks.

Do's and Don'ts
DO: Use strict Futura or Century Gothic for a very authentic mid-century feel.

DON'T: Make the UI look dirty or distressed (that's standard retro or steampunk). Retro-futurism is clean, optimistic, and shiny.

Limitations
This is a styling reference and does not replace environment-specific validation, accessibility testing, or expert review.

Ensure appropriate contrast ratios and responsive behaviors are verified separately.