# CSARCH2-Virtual-Exhibit-Proposal

Group’s title: Project Y2K

Group’s member roster:
  - Adrian Matthew Dee
  - Alain Zuriel Marcos
  - Elkan La Madrid
  - Jenrick Lim
  - Kent Lopez

Group’s topic theme: The Y2K Bug in the 20th century

Group’s tech stack plan:

  1. Frontend
  
    - Astro 6
      Astro will serve as the primary framework for our virtual exhibit. It is the required framework for the project template and will be responsible for rendering the museum page.
  
    - React (JSX)
      React will be used to develop all the interactive exhibit elements. The project's simulations and educational games will be implemented as reusable JSX components, displayed in the MDX file. 
      In addition, most of us have experience with using React JSX.
  
    - MDX
      MDX will be used to create the main exhibit content page. It combines the introduction and technical explanations with embedded React components for interactive demonstrations.
    
    - CSS
      Traditional CSS will be used to replicate the visual style of late-1990s computing environments. In addition, most of us have experience with using traditional CSS.
    
  2.  Backend
    
    - Node.js 
      Node.js will provide the runtime environment for the backend of our local development and for the deployment of the Astro application. Moreover, it is also very compatible and is required by Astro.
    
    - Express
      Express will be used only if additional backend functionality becomes necessary. In addition, the majority of the team has experience in utilizing Express with Node.js.


# I. Proposed Structure:

  1. Introduction (Story Hook)
    - What is Y2K?
    - Why everyone feared the year 2000
    - “Would computers think 2000 = 1900?”
  
  2. Technical Explanation (CSARCH core)
     
    a. 2-Digit Year Storage
      - In the early years of computing, storage costs were extremely expensive, and so programmers stored years as only 2 digits in order to conserve space. COBOL, which was the dominant language, defined it in its data          definitions as 6-digit date fields: PIC 9(6) 
  
    b. Memory Limitations
      - The problem also existed at the hardware level and not just in code, mainly in BIOS chips and Real-Time Clock (RTC) chips storing the dates in a 2-digit BCD (Binary Coded Decimal) format)
  
    c. Ambiguity
      - Since “00” was ambiguous, machines encountered a lot of problems as there was no proper definition of the year 2000.
  
    Example:
    1999 -> "99"
    2000 -> "00" - interpreted as 1900
    
    Because of this, systems encountered three (3) main problems:
      a. Negative arithmetic: For example, systems would calculate a person born in 1950 as -50.
      b. Wrong sort order: Any new data encoded 2000 and onwards will be recorded and shown under 1999 data and below. (“99” > “00”)
      c. Crashes: Some systems didn’t recognize “00” and would outright be rejected as input.
  
  3. Timeline Section (visual)
      1970-1990: systems designed with shortcuts
      1995-1999: panic begins
      1999-2000: global remediation effort


* II. Interactive Components

  1. Interactive Simulation - “The Year Counter: Stop at 2000.”
     
    Concept:
    A simple system clock simulation of years going from 1900 → 2000.
    
    Gameplay:
    User has to stop the system by pressing a button at any point to pause the year:
    1990, 1991, 1992… 1998, 1999, 2000 → 1990, 1991…
    
    Once it reaches 2000, it returns to 1990 and loops all over again.
    But there is a twist once the user stops it exactly at 2000:
    If the user reaches 2000 → crash animation, then the system continues after any button press
    
    What it teaches:
    The threat of a rollover bug
    Integer overflow/misinterpretation
    System failure due to representation


  2. Interactive Game - “Midnight Crisis Fix-it Game.”
     
    Concept:
    You are a software engineer on December 31, 1999, and you must fix the systems before midnight.
    
    Gameplay:
    You get a list of systems:
    [1] Banking System
    [2] Airline Reservation System
    [3] Hospital Records
    [4] Power Grid
    Each costs “time” to patch.
    A timer runs (The timer is only 12 minutes, but 24 minutes at 2.0 speed is displayed to resemble 24 hours):
    23:58 -> 23:59 -> 00:00
    
    
    
    Outcome states:
    Fixed systems: World is Stable ending
    Missed systems: System Collapse Simulation.
    
    
    What it teaches:
    Prioritization in system design
    Real-world engineering constraints
    Why did Y2K cost billions to fix


* III. Proposed Design Layout

PC Display

















Mobile Display


