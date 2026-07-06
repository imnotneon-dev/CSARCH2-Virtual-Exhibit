# CSARCH2 Virtual Exhibit Proposal

**Group Name:** *Project Spectre* (Updated) <br> 
**Topic Theme:** *Spectre and Meltdown Vulnerabilities (2018)* (Updated)
<br>
**GitHub Link:** https://github.com/Metthy1871/CSARCH2-Virtual-Exhibit-Proposal

## Group Members

- Adrian Matthew Dee
- Alain Zuriel Marcos
- Elkan La Madrid
- Jenrick Lim
- Kent Lopez

---

## Tech Stack (Updated)

### Frontend (Updated)

| Technology | Role |
|---|---|
| Astro 6 | Primary framework; required by the project template; handles museum page rendering |
| React (JSX) | All interactive exhibit elements - simulations and educational games as reusable JSX components embedded via MDX |
| MDX | Main exhibit content page; combines written content with embedded React components |
| CSS | Styling; used to replicate the visual appearance of a computer security operations center |

#### 1. Astro 6

Astro will serve as the primary framework for our virtual exhibit. It is the required framework for the project template and will be responsible for rendering the museum page.

**Will be used for:**
- Easy integration of React components
- Compatible with the central museum website architecture

#### 2. React (JSX)

React will be used to develop all the interactive exhibit elements. The project's simulations and educational games will be implemented as reusable JSX components, displayed in the MDX file. In addition, most of us have experience with using React JSX.

**Will be used for:**
- Password Leak Simulator Component (Interactive Simulation)
- Patch the Memory Leak Game Component (Interactive Game)
- Interactive Timeline Component
- Quiz Components and Popups

#### 3. MDX

MDX will be used to create the main exhibit content page. It combines the introduction and technical explanations with embedded React components for interactive demonstrations.

**Will be used for:**
- Easy content and component placement manipulation
- Integration between text and interactive elements

#### 4. CSS

Traditional CSS will be used to replicate the visual appearance of a computer security operations center and modern processor monitoring tools.

**Planned design elements:**
- Hacker-themed cybersecurity interface
- Terminal windows and command prompts
- CPU monitoring dashboards
- Cache visualization effects
- Warning popups and security alerts
- Responsive layouts for desktop and mobile devices
- Animations showing data leakage and memory access

---

### Backend (Updated)

| Technology | Role |
|---|---|
| Node.js | Runtime environment for local development and Astro deployment |
| Express | Included as a contingency for additional backend functionality if needed |

#### 1. Node.js

Node.js will provide the runtime environment for the backend of our local development and for the deployment of the Astro application. Moreover, it is also very compatible and is required by Astro.

**Will be used for:**
- Compatibility with Astro, since it's required by Astro
- Supports modern JavaScript tooling and is compatible with React (JSX)

#### 2. Express

Express will be used only if additional backend functionality becomes necessary. In addition, the majority of the team has experience in utilizing Express with Node.js.

**Potential uses:**
- Recording quiz scores
- Tracking game completion statistics
- Visitor analytics


---

## I. Proposed Structure

### 1. *Introduction (Story Hook)* (Updated)

In 2018, the digital world faced a nightmare when two security flaws were discovered in the physical chips of every computer and smartphone on Earth. These flaws are known as Spectre and Meltdown. Unlike typical viruses that can easily be deleted, there were “hardware vulnerabilities” that had existed for decades. The problem originated from a design choice to make devices faster by having chips predict the user's next action. However, this speed trick inadvertently left a backdoor for hackers to steal private information, such as passwords. Furthermore, this discovery caused a global panic because the flaw was built into the physical parts of the machines, making it nearly impossible to fix without slowing down computers everywhere. Ultimately, Spectre and Meltdown served as a powerful lesson that the rush for faster technology can create deep security risks that put the entire world’s privacy at stake.

### 2. Technical Explanation (CSARCH Core) (Updated)

#### a. *Speculative Execution* (Updated)

Modern processors attempt to improve performance by predicting future instructions and executing them ahead of time.

Example:

if (userIsAuthorized)
   accessSecretData();
   
The CPU may temporarily execute the instruction before confirming whether the user is actually authorized.
Normally these speculative operations are discarded. However, traces remain in the CPU cache.

#### b. *CPU Cache* (Updated)

A cache is a small, high-speed memory area that stores frequently used data.

Accessing cached data is significantly faster than retrieving data from main memory.

Attackers can measure timing differences to determine whether certain data was loaded into cache.

#### c. *Meltdown* (Updated)

Meltdown allows an attacker to read privileged kernel memory from an unprivileged application.

It effectively breaks the isolation between:
- User applications
- Operating system memory

Potentially exposed information:
- Passwords
- Encryption keys
- Sensitive operating system data

#### d. *Spectre* (Updated)

Spectre tricks programs into executing instructions they normally would not execute.

Instead of directly bypassing permissions, it manipulates speculative execution behavior to leak data through cache timing.

Potentially affected:
- Browsers
- Applications
- Virtual machines
- Cloud computing environments


### 3. *Timeline (Visual Section)* (Updated)

| Period | Event |
|---|---|
| 1995–2017 | Speculative execution becomes a standard feature in modern CPUs |
| Mid-2017 | Researchers privately discover Spectre and Meltdown |
| 2018 | Major emergency patching efforts worldwide |
| 2019 | CPU manufacturers redesign hardware to reduce future risksy |

---

## II. Interactive Components (Updated)

### 1. Interactive Simulation: The Hidden Password Leak

**Concept:**  
This simulation shows how a password can remain hidden in the normal user interface while still being reconstructed through cache timing clues.

**Gameplay:**

- The user first sees a masked password field, such as `********`.
- The player switches to "View as Attacker".
- The attacker dashboard displays a probe-array timing table.
- Each round starts by clicking "Trigger Memory Access".
- The player must identify the probe address with the lowest cycle count.
- Correct choices reveal one character of the password reconstruction buffer.
- Wrong choices increase detection risk.
- The simulation ends when the full password is reconstructed or detection risk reaches 100%.

**What it teaches:**

- Masked interface data is not the same as inaccessible data
- Cache timing can reveal information without directly displaying memory
- Fast cache hits can act as clues for side-channel attacks
- Security monitoring can detect repeated suspicious probing

---

### 2. Interactive Game: Speculative Execution Lab

**Concept:**  
This game turns the player into the CPU. Each round presents a branch instruction, prediction confidence, data sensitivity, and branch history. The player must balance performance against the risk of leaving cache traces behind.

**Gameplay:**

- The game runs through 10 randomized instruction rounds.
- Each round shows an instruction card with branch history, prediction, confidence, data type, and base risk.
- The player chooses one of four CPU behaviors:
  - Wait for Check
  - Speculate
  - Speculate + Flush
  - Insert Fence
- Speculation can save cycles and increase performance, but risky speculation can raise cache trace risk.
- Waiting, flushing, and fencing reduce risk but spend more of the cycle budget.
- The run ends when all rounds are cleared, cache trace risk reaches 100%, or the cycle budget reaches 0.

**Outcome states:**

- Complete
- Cache Leak
- Budget Exhausted

**Possible verdicts:**

- Balanced CPU Behavior
- High Performance, Moderate Risk
- Secure but Slow
- Risky Optimization
- Speculative Leak
- Over-Serialized Pipeline

**What it teaches:**

- Speculative execution improves performance but can leave observable side effects
- Discarded speculative results do not necessarily erase cache traces
- Sensitive or protected data requires more cautious CPU behavior
- Mitigations such as waiting, flushing, and fencing have performance costs
  
---

### 3. *Interactive Game – "Patch the Memory Leak"* (Updated)

**Concept:** You are a cybersecurity engineer responding to the disclosure of Spectre and Meltdown. Your goal is to secure critical systems before attackers steal sensitive data.

**Gameplay:**

A briefing screen opens the game with the scenario, a how-to-play walkthrough, and a description of every action, before a **Start Incident Response** button begins the run.

Players are given a set of vulnerable systems:
  - `[1]` Banking Server (Critical)
  - `[2]` Cloud Database (Critical)
  - `[3]` Hospital Records (High)
  - `[4]` Government Portal (High)
  - `[5]` Web Browser (Medium)
  
Each system requires a different patching effort, and only **2 engineers** can work at once; attempting a 3rd action is blocked until one finishes.

The player has a shared **90-second countdown** (limited time) and a **2-engineer capacity** (limited resources).

Possible actions (all 5 are available on every system):
- Apply Operating System Patch
- Install Browser Update
- Enable Kernel Isolation
- Deploy Security Monitoring
- Ignore Risk
  
Every choice consumes time; even Ignore Risk, which takes a few seconds to log.

Each system has one or two *correct* actions (e.g., the Web Browser needs a Browser Update; servers need an OS Patch or Kernel Isolation). Applying the right patch **fully secures** the system. Applying the **wrong** patch still costs the full time but does nothing; the system is left "Misapplied." Deploy Security Monitoring is faster than a full patch but only ever gives **partial** coverage. The run ends when the timer hits zero, or immediately if every system is fully secured first.

**Outcome states:**
- Both critical systems (Banking Server, Cloud Database) fully secured, and everything else secured or monitored → **Secure Infrastructure** ending
- Critical systems held, but a system was missed, misapplied, or only monitored → **Partial Breach** ending
- A critical system left vulnerable, ignored, misapplied, or still mid-patch when time runs out → **Major Security Incident** ending
- 
**What it teaches:**
- Real-world cybersecurity incident response
- Resource prioritization under time pressure and staffing limits
- Importance of patch management
- Why organizations spent significant resources mitigating Spectre and Meltdown

---

## III. *Proposed Design Layout*

### PC Display

![PC Display 1](public/PC-Display_1.png)
![PC Display 2](public/PC-Display_2.png)
![PC Display 3](public/PC-Display_3.png)
![PC Display 4](public/PC-Display_4.png)

### Mobile Display

![Mobile Display 1](public/Mobile-Display1.png)
![Mobile Display 1](public/Mobile-Display2.png)
![Mobile Display 1](public/Mobile-Display3.png)
![Mobile Display 1](public/Mobile-Display4.png)

Mobile Optimizations:
- Touch-friendly controls
- Simplified CPU diagrams
- Responsive timeline cards
- Compact security dashboards



