# Project Beyond Box: Full Technical Handover & Master Context

## 1. Project Mission & High-Level Scope
The goal of this project was to transform a library of legacy educational science simulations (built in p5.js) into a professional, mobile-ready platform. The simulations are hosted on a **Wix website** inside **iframes**. The project focused on solving three main pillars: **Responsive Layouts**, **Mobile Interaction Reliability**, and **Cross-Origin Iframe Synchronization**.

*   **Target User:** Students using mobile phones (Portrait orientation) or Desktop browsers.
*   **Target Environment:** Wix Mobile Site (Parent) -> GitHub Pages (Iframe).
*   **Developer GitHub:** `parthmevada2307`

---

## 2. The Repository Map (Stage-by-Stage)

### Series A: The pH Scale Simulations
This series teaches acidity and alkalinity through litmus paper and meter testing.
1.  **`Simu` (Main Menu):**
    *   **Purpose:** The central portal where students choose Stage 1, 2, or 3.
    *   **Fixes:** Converted from a static canvas to a responsive DOM-button list. This allows the browser to handle scrolling naturally.
2.  **`Sim1` (Stage 1):**
    *   **Purpose:** Basic Litmus paper testing.
    *   **Fixes:** Implemented `isPortrait` logic to space out liquids vertically. Added `scrollIntoView` to prevent "Cut-off" layout.
3.  **`Sim2` (Stage 2):**
    *   **Purpose:** Identifying Strong/Weak Acids and Bases using a pH Meter.
    *   **Fixes:** Overcame the "White Block" bug. The info box was moved to the **Top Section** in portrait mode and text colors were normalized for visibility.
4.  **`Sim3` (Stage 3):**
    *   **Purpose:** Advanced measurement with precise pH values.
    *   **Fixes:** Applied identical bulletproof button logic and layout spacing as Stage 2.

### Series B: The Trajectory Tester Simulations
This series teaches projectile motion, gravity, and physics variables.
1.  **`simulat` (Main Menu):**
    *   **Purpose:** Entry point for physics simulations.
    *   **Fixes:** Modernized layout to use native browser buttons to ensure the user can scroll to reach the lower levels on small screens.
2.  **`simul1` (Stage 1 - Earth):**
    *   **Purpose:** Basic projectile physics.
    *   **Fixes:** Transitioned UI controls (Launch/Reset) from canvas-detection to DOM elements.
3.  **`simulat2` (Stage 2 - Moon):**
    *   **Purpose:** Projectile motion in low gravity.
    *   **Fixes:** Standardized `pixelDensity(1)` for GPU performance on mobile and fixed "Reset button" failure.
4.  **`simulat3` (Stage 3 - Space/Custom):**
    *   **Purpose:** Experimentation with air resistance and speed.
    *   **Fixes:** Finalized mobile interaction patterns to ensure no taps are missed by the physics engine.

---

## 3. The "Deep Thinking" Evolution (Lessons Learned)

### Lesson 1: The p5.js Touch Blockage
**Initial Approach:** Using p5 `touchStarted()` to handle UI.
**Problem:** Defining `touchStarted` and returning `false` (standard p5 practice) tells the browser "I own this touch, don't scroll the page." This made the simulations feel "stuck" on mobile.
**The Fix:** We removed `return false;` in critical areas and moved UI interactions to **DOM elements** (`createButton`) which the browser handles natively, allowing for simultaneous UI usage and scrolling.

### Lesson 2: The Wix Iframe Scroll Trap
**Problem:** A unique bug where scrolling down the Wix site to click "Stage 3" left the *next* page cut off at the top.
**Discovery:** Because the iframe and Wix are different domains, the iframe cannot scroll the parent page. Standard `window.scrollTo(0,0)` only scrolls the iframe's internal content, not the parent view.
**The Fix:** We used a "Cross-Origin Bypass": `document.documentElement.scrollIntoView()`. This tells the parent browser: "The user needs to see the top of this iframe now," which forces the Wix page to snap back to the top.

### Lesson 3: The iOS "Ghost" Button Fix
**Problem:** Buttons like "Reset" or "Launch" would work on Android but fail 50% of the time on iPhone.
**Reason:** iOS Safari often suppresses "Click" events if they happen on top of a p5 Canvas.
**The Fix:** We implemented a dual-listener approach. We bind `touchstart` for instant mobile response and `click` for desktop.
```javascript
// The Final Bulletproof Pattern
btn.elt.addEventListener('touchstart', function(e) {
    e.preventDefault(); // Blocks the browser from trying to turn this into a click
    action(); 
}, { passive: false });
btn.elt.addEventListener('click', action);
```

---

## 4. Current Design Standard (The "Golden Rules")
Every simulation in the Beyond Box library should now follow these 4 standards:

1.  **Responsive Layout:** Always use `isPortrait = height > width` to detect mobile and adjust the `layout` object variables (`beakerCx`, `topMargin`, etc.) specifically for portrait vs landscape.
2.  **Iframe Reset:** Every `setup()` function must contain:
    `setTimeout(() => { document.documentElement.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);`
3.  **CSS:** `style.css` must have:
    `html, body { width: 100%; height: 100%; overflow: hidden; touch-action: none; }`
4.  **Buttons:** Never use `mousePressed()` for UI buttons. Always use `createButton()` and bind `touchstart` + `click` listeners to the `.elt` (native element).

---

## 5. Current Project Status
All 8 repositories listed above have been updated, committed, and pushed. The simulations are currently fully interactable on mobile, they correctly reset the Wix scroll position on navigation, and the UI layout is optimized to prevent overlap on small screens.
