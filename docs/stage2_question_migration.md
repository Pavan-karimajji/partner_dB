# Stage 2 -- Question Migration Tracking

Source: `docs/adas_vendor_technical_evaluation_internal.xlsx` (+ supplier variant) and `docs/adas_partner_perception_and_function_evaluation.xlsx`. 217 total source items (139 + 78).

Each item below has a proposed target (General vs Product, and scope if Product). Tick the checkbox once we've confirmed placement together. All 8 open decisions below are resolved; 3 items are marked DROPPED as confirmed duplicates and pre-checked.


## Open decisions -- RESOLVED (see plan.md Stage 2 section for rationale)

1. **DMS modeling** -> added as a Function (`DMS`), parallel to AEB/ACC/etc. DMS sections are now function:DMS scoped.

2. **Compute/SoC/TOPS duplicate** -> merged into one Product-common "Architecture & Platform" section. PERC-S3#1 dropped as a literal duplicate of TECH#17; the complementary deeper PERC items (TIDL, quantization, min-TOPS, camera min-spec) kept.

3. **AUTOSAR duplicate** -> kept TECH#22 (broader), dropped PERC-S3#10 (narrower subset).

4. **SIL/HIL/simulator duplicate** -> kept TECH#57-59 (more complete breakdown), dropped PERC-S3#13.

5. **Camera-only vs generic split** -> applied per-item: TECH#49/#52/#53 (IP rating, lens contamination, calibration drift) -> Camera Subsystem; TECH#48/#50/#51 (operating temp, EMC/EMI, vibration/shock) + all of Components -> Product-common "HW Robustness & Components". PERC-S3#11/#12 (ISP dependency, calibration tooling) also moved to Camera Subsystem despite sitting in generic "Integration" category.

6. **Function-scoped safety items** ("Target ASIL per function", "Safe state definition per function") -> kept in General as free text; no new scoping infrastructure built for just 2 items.

7. **Camera-scoped lifecycle item** -> TECH#109 ("Spare parts strategy (camera modules)") moved to Camera Subsystem.

8. **Limitations / India Readiness** -> Product-common (wording is explicitly about "your current stack", not company-wide).


## Technical Evaluation (139 items)


### SECTION 1 — COMPANY & PRODUCT MATURITY

- [ ] **TECH#1** (Corporate) -- Provide your company founding year and automotive industry history.
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **TECH#2** (Corporate) -- What is your total headcount and ADAS-specific R&D staff count?
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **TECH#3** (Corporate) -- Describe your geographic presence and engineering support capability in India.
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **TECH#4** (Corporate) -- Provide key leadership and technical team credentials relevant to ADAS.
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **TECH#5** (Track Record) -- List your current OEM production programs (named or anonymized) — vehicle program, SOP date, annual volume.
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **TECH#6** (Track Record) -- What vehicle classes does your ADAS solution currently support — passenger cars, SUVs, LCVs?
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **TECH#7** (Track Record) -- What is your cumulative production volume shipped to date?
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **TECH#8** (Track Record) -- How many SOP program launches have you completed? Provide evidence of ramp-up.
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **TECH#9** (Track Record) -- Field failure rate / warranty data [internal-only -- no vendor-facing phrasing in source]
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **TECH#10** (Track Record) -- Have your customers achieved NCAP ratings using your ADAS stack? Provide details.
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **TECH#11** (Certifications) -- What is your current ASPICE level? Has it been third-party audited?
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **TECH#12** (Certifications) -- Do you hold IATF 16949 certification for production parts?
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **TECH#13** (Roadmap) -- Describe your product roadmap over the next 3–5 years.
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **TECH#14** (Roadmap) -- Which SoC platforms do you support or plan to support — TI TDA4x, Qualcomm SA8x, Renesas R-Car, NXP S32?
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **TECH#15** (Roadmap) -- Do you support OTA software updates? Describe your OTA architecture — A/B partition, delta, rollback.
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **TECH#16** (Roadmap) -- What is your compliance roadmap for Euro NCAP 2026, GSR2, and AIS-184 India?
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"


### SECTION 2 — SYSTEM ARCHITECTURE

- [ ] **TECH#17** (Compute) -- Which SoC platform(s) does your stack currently target? Provide TOPS rating and utilization.
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#18** (Compute) -- Describe your CPU/GPU/NPU/DSP resource partitioning strategy.
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#19** (Compute) -- Do you have a Hardware Abstraction Layer (HAL)? Has SoC swap been demonstrated or planned?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#20** (Compute) -- What is the typical and peak power consumption? Provide thermal envelope.
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#21** (Compute) -- Describe your memory architecture — DDR bandwidth analysis, shared vs dedicated.
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#22** (SW Arch) -- Do you support AUTOSAR Adaptive and/or Classic? Describe integration status.
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#23** (SW Arch) -- What OS/RTOS does your stack run on — QNX, Linux, SafeRTOS, or other?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#24** (SW Arch) -- Describe your middleware architecture. Do you support SOME/IP, DDS, or other IPC?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#25** (SW Arch) -- Do you support CAN, CAN-FD, and Automotive Ethernet? Is signal mapping documented?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#26** (SW Arch) -- Describe your data logging and replay framework — capacity, format, lossless capability.
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#27** (SW Arch) -- Describe your calibration architecture. Do you support XCP/CCP and provide A2L files?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#28** (Pipeline) -- What is your end-to-end pipeline latency from camera input to actuation output? Provide measured data.
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#29** (Pipeline) -- What is your cold boot time to first valid output and full pipeline availability?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#30** (Pipeline) -- What is your warm restart / recovery time after a watchdog reset?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#31** (Pipeline) -- Describe your watchdog implementation — hardware and software levels, escalation logic.
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#32** (Pipeline) -- How does your system handle errors and exceptions — graceful degradation, logging?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#33** (Power) -- Describe your sleep/wake behavior and ignition cycle state machine. What is parasitic draw in sleep?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **TECH#34** (Power) -- Describe your graceful shutdown sequence — safe state before power loss, NVM write protection.
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"


### SECTION 3 — CAMERA & SENSOR SUBSYSTEM

- [ ] **TECH#35** (Sensor) -- Which image sensor do you use? Is it AEC-Q100 automotive grade? Provide supplier and model.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#36** (Sensor) -- What sensor type do you use for forward camera and DMS — RGB, RGB-IR, or NIR? Explain the selection rationale.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#37** (Sensor) -- What is the sensor resolution and pixel size for each camera?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#38** (Sensor) -- What is the dynamic range (HDR capability) of your sensor? Provide measured performance.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#39** (Sensor) -- What is the minimum lux level your system operates at — for forward camera and DMS separately?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#40** (Sensor) -- Does your sensor support LED Flicker Mitigation (LFM)? Has it been tested against LED traffic signals?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#41** (Sensor) -- What is the field of view (H × V × D) for each camera?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#42** (Sensor) -- How do you handle rolling shutter artifacts — global shutter or RS compensation algorithm?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#43** (ISP) -- Describe your ISP pipeline — on-chip or external? Is it tunable per environment?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#44** (ISP) -- How does your auto exposure and auto white balance perform? What is convergence time in frames?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#45** (ISP) -- How does your system handle tunnel entry and exit — adaptation time and behavior?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#46** (ISP) -- How does your system handle sun glare and strong backlight conditions?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#47** (ISP) -- For DMS: how does your IR cut filter / day-night switching work? What is transition time?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#48** (Robustness) -- What is the operating temperature range for the sensor and ECU?
  - -> proposed: **product** / scope: none (common) / section: "HW Robustness & Components"

- [ ] **TECH#49** (Robustness) -- What is the IP rating for your camera modules — exterior and cabin?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#50** (Robustness) -- What EMC/EMI compliance standards have been met? Provide test reports.
  - -> proposed: **product** / scope: none (common) / section: "HW Robustness & Components"

- [ ] **TECH#51** (Robustness) -- What vibration and shock resistance testing has been completed?
  - -> proposed: **product** / scope: none (common) / section: "HW Robustness & Components"

- [ ] **TECH#52** (Robustness) -- Does your stack include lens contamination/blockage detection? What is coverage estimation accuracy?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#53** (Robustness) -- What is the calibration drift over the product lifetime? Do you have a self-calibration algorithm?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#54** (Components) -- Is your BOM transparent? Do you have a second-source strategy for key components?
  - -> proposed: **product** / scope: none (common) / section: "HW Robustness & Components"

- [ ] **TECH#55** (Components) -- Are all components AEC-Q100/Q104 qualified? Are full qualification reports available?
  - -> proposed: **product** / scope: none (common) / section: "HW Robustness & Components"

- [ ] **TECH#56** (Components) -- What is your chip shortage contingency plan — buffer stock, multi-fab sourcing?
  - -> proposed: **product** / scope: none (common) / section: "HW Robustness & Components"


### SECTION 8 — VALIDATION & TEST INFRASTRUCTURE

- [ ] **TECH#57** (SIL/HIL) -- Do you have a SIL (Software-in-the-Loop) capability? Can the full perception stack run on a PC?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#58** (SIL/HIL) -- Do you have a HIL (Hardware-in-the-Loop) setup with real ECU and simulated sensors?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#59** (SIL/HIL) -- Which simulation tools do you integrate with — IPG CarMaker, CARLA, LGSVL, NVIDIA DriveSim?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#60** (SIL/HIL) -- Do you have a synthetic data generation pipeline — weather, lighting, domain randomization?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#61** (SIL/HIL) -- Do you support OpenSCENARIO/ASAM scenario generation? How large is your scenario library?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#62** (Data) -- Describe your replay validation framework. Is replay bit-exact or validated-equivalent?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#63** (Data) -- How many total replay hours do you have available? What geographies does it cover?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#64** (Data) -- How is your dataset managed — searchable, version-controlled, metadata-tagged?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#65** (Data) -- Describe your annotation pipeline — tooling, multi-annotator consensus, QA sampling rate.
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#66** (Data) -- Do you have an automated edge case data mining pipeline from fleet data?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#67** (CI/CD) -- Do you have an automated regression framework? How frequently does it run?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#68** (CI/CD) -- Is your CI/CD pipeline integrated with build, unit test, and SIL on every commit?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#69** (CI/CD) -- How many automated test scenarios do you have in your regression suite?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#70** (CI/CD) -- What is your test coverage per ADAS function against requirements?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#71** (Real-World) -- How many test vehicles do you operate and across which markets?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#72** (Real-World) -- What is your total accumulated real-world test mileage? Which geographies?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"

- [ ] **TECH#73** (Real-World) -- Do you have access to a dedicated test track for AEB and LKA testing?
  - -> proposed: **general** / scope: none (common) / section: "Validation & Test Infrastructure"


### SECTION 9 — FUNCTIONAL SAFETY (ISO 26262 / SOTIF)

- [ ] **TECH#74** (FuSa) -- What ASIL level do you target per ADAS function — AEB, LKA, DMS?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#75** (FuSa) -- Are all safety concepts available — TSC, FSC, HSC, SSC? Can these be shared under NDA?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#76** (FuSa) -- Describe your ASIL decomposition strategy per function.
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#77** (FuSa) -- Do you have FMEA and FMEDA available — hardware FMEDA with DC and SFF, SW FMEA per module?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#78** (FuSa) -- What are your diagnostic coverage (DC) metrics per ASIL level?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#79** (Safety Arch) -- Describe your safety monitor / supervisor architecture — is it independent from the main pipeline?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#80** (Safety Arch) -- What is your fallback mechanism — fail-safe or fail-operational? What is the safe state transition time?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#81** (Safety Arch) -- How does your system detect and handle sensor faults — camera open/short/blind/blocked/degraded?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#82** (Safety Arch) -- What plausibility checks are applied to all AI outputs — range, rate, consistency?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#83** (Safety Arch) -- What is the defined safe state per function and what is the transition time?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#84** (SOTIF) -- Has a SOTIF analysis been completed? Are known and unknown triggering conditions documented?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#85** (SOTIF) -- How many triggering conditions have been cataloged per function?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#86** (SOTIF) -- What AI-specific SOTIF measures do you implement — ODD monitoring, confidence thresholding, fallback?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#87** (Fault Inject) -- Do you have fault injection test capability — SW and HW, automated?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#88** (Fault Inject) -- Has an independent third-party safety assessment been completed?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"


### SECTION 10 — CYBERSECURITY (ISO 21434)

- [ ] **TECH#89** (Cybersec) -- Describe your secure boot chain — root of trust, verified boot stages.
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#90** (Cybersec) -- How is OTA update security implemented — signed packages, encrypted transport, rollback protection?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#91** (Cybersec) -- How is communication secured internally and externally — TLS/DTLS, SecOC, MACsec?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#92** (Cybersec) -- Describe your key management system — HSM-based, key rotation, per-vehicle keys?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#93** (Cybersec) -- How are debug ports protected in production builds?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#94** (Cybersec) -- Has a TARA (Threat Analysis & Risk Assessment) been completed per ISO 21434?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#95** (Cybersec) -- Has your system been tested against camera spoofing or adversarial attacks?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#96** (Cybersec) -- Has a third-party penetration test been completed? Were findings remediated?
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#97** (Privacy) -- GDPR / privacy compliance (DMS/OMS data) [internal-only -- no vendor-facing phrasing in source]
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#98** (Privacy) -- Data anonymization pipeline [internal-only -- no vendor-facing phrasing in source]
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"

- [ ] **TECH#99** (Privacy) -- Driver consent management [internal-only -- no vendor-facing phrasing in source]
  - -> proposed: **general** / scope: none (common) / section: "Functional Safety & Cybersecurity"


### SECTION 11 — PRODUCTION READINESS & LIFECYCLE

- [ ] **TECH#100** (Production) -- Describe your SOP readiness — have all production gates been passed (PPAP equivalent)?
  - -> proposed: **product** / scope: none (common) / section: "Production Readiness & Lifecycle"

- [ ] **TECH#101** (Production) -- Describe your end-of-line calibration process — automation, time per camera, tolerance.
  - -> proposed: **product** / scope: none (common) / section: "Production Readiness & Lifecycle"

- [ ] **TECH#102** (Production) -- Describe your ECU flashing process for factory and field — reprogramming time?
  - -> proposed: **product** / scope: none (common) / section: "Production Readiness & Lifecycle"

- [ ] **TECH#103** (Production) -- How do you manage vehicle configuration variants — feature flags, variant coding, ODX-based?
  - -> proposed: **product** / scope: none (common) / section: "Production Readiness & Lifecycle"

- [ ] **TECH#104** (Production) -- Has your stack been demonstrated on more than one SoC platform? Quantify porting effort.
  - -> proposed: **product** / scope: none (common) / section: "Production Readiness & Lifecycle"

- [ ] **TECH#105** (OTA) -- Describe your OTA update architecture — A/B partition, delta updates, rollback strategy.
  - -> proposed: **product** / scope: none (common) / section: "Production Readiness & Lifecycle"

- [ ] **TECH#106** (OTA) -- Fleet monitoring dashboard [internal-only -- no vendor-facing phrasing in source]
  - -> proposed: **product** / scope: none (common) / section: "Production Readiness & Lifecycle"

- [ ] **TECH#107** (OTA) -- Describe your field log collection and upload strategy — event-triggered, periodic, bandwidth-aware.
  - -> proposed: **product** / scope: none (common) / section: "Production Readiness & Lifecycle"

- [ ] **TECH#108** (OTA) -- What remote diagnostics capability do you offer — DTCs, sensor status, SW version?
  - -> proposed: **product** / scope: none (common) / section: "Production Readiness & Lifecycle"

- [ ] **TECH#109** (Lifecycle) -- What is your spare parts strategy for camera modules — supply period, drop-in replacement?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **TECH#110** (Lifecycle) -- How do you manage end-of-life and component obsolescence — last-buy notification, migration path?
  - -> proposed: **product** / scope: none (common) / section: "Production Readiness & Lifecycle"

- [ ] **TECH#111** (Lifecycle) -- What are your warranty terms and ADAS-specific liability framework?
  - -> proposed: **product** / scope: none (common) / section: "Production Readiness & Lifecycle"

- [ ] **TECH#112** (Lifecycle) -- What is the IP and model ownership arrangement — source code escrow, trained model rights?
  - -> proposed: **product** / scope: none (common) / section: "Production Readiness & Lifecycle"


### SECTION 12 — SOFTWARE QUALITY & RELIABILITY

- [ ] **TECH#113** (SW Quality) -- Are you MISRA-C/C++ compliant for safety code? Is a deviation log maintained?
  - -> proposed: **product** / scope: none (common) / section: "Software Quality"

- [ ] **TECH#114** (SW Quality) -- Which static analysis tool do you use? What are the current critical findings?
  - -> proposed: **product** / scope: none (common) / section: "Software Quality"

- [ ] **TECH#115** (SW Quality) -- How do you prevent memory leaks — Valgrind/ASan testing, no dynamic allocation at runtime?
  - -> proposed: **product** / scope: none (common) / section: "Software Quality"

- [ ] **TECH#116** (SW Quality) -- What is your unit test line and branch coverage percentage?
  - -> proposed: **product** / scope: none (common) / section: "Software Quality"

- [ ] **TECH#117** (SW Quality) -- Do you have MC/DC coverage for safety-critical modules as required for ASIL-B+?
  - -> proposed: **product** / scope: none (common) / section: "Software Quality"

- [ ] **TECH#118** (SW Quality) -- Has your system been validated in a long-duration stability test (>72h continuous run)?
  - -> proposed: **product** / scope: none (common) / section: "Software Quality"

- [ ] **TECH#119** (SW Quality) -- How does your system handle CPU overload — graceful frame skip, priority preserved, no crash?
  - -> proposed: **product** / scope: none (common) / section: "Software Quality"

- [ ] **TECH#120** (SW Quality) -- Describe your crash recovery process — auto-restart, crash log, core dump preservation.
  - -> proposed: **product** / scope: none (common) / section: "Software Quality"


### SECTION 16 — HMI & DRIVER INTERACTION

- [ ] **TECH#121** (HMI) -- Describe your multi-modal alert design — visual, audio, haptic escalation ladder. Is it OEM-configurable?
  - -> proposed: **product** / scope: none (common) / section: "HMI & Driver Interaction"

- [ ] **TECH#122** (HMI) -- How is the driver takeover request (TOR) strategy implemented?
  - -> proposed: **product** / scope: none (common) / section: "HMI & Driver Interaction"

- [ ] **TECH#123** (HMI) -- How does your warning suppression logic work to avoid nuisance alerts?
  - -> proposed: **product** / scope: none (common) / section: "HMI & Driver Interaction"

- [ ] **TECH#124** (HMI) -- Provide your HMI integration API / interface specification — cluster, HUD, audio interfaces.
  - -> proposed: **product** / scope: none (common) / section: "HMI & Driver Interaction"

- [ ] **TECH#125** (HMI) -- Does your alert content support multiple languages and regions — icons, text, audio?
  - -> proposed: **product** / scope: none (common) / section: "HMI & Driver Interaction"


### SECTION 17 — REGIONAL & REGULATORY COMPLIANCE

- [ ] **TECH#126** (Compliance) -- What is your readiness for Euro NCAP 2025/2026 protocols — AEB VRU, LSS, OMS, DMS?
  - -> proposed: **product** / scope: none (common) / section: "Regional & Regulatory Compliance"

- [ ] **TECH#127** (Compliance) -- What is your readiness for Bharat NCAP / GNCAP — AEB car-to-car and VRU?
  - -> proposed: **product** / scope: none (common) / section: "Regional & Regulatory Compliance"

- [ ] **TECH#128** (Compliance) -- What is your AIS-184 (India ADAS regulation) compliance status — AEBS, LDWS?
  - -> proposed: **product** / scope: none (common) / section: "Regional & Regulatory Compliance"

- [ ] **TECH#129** (Compliance) -- What is your UN R79 (steering) and UN R131 (AEBS) type approval readiness?
  - -> proposed: **product** / scope: none (common) / section: "Regional & Regulatory Compliance"

- [ ] **TECH#130** (Compliance) -- What is your EU General Safety Regulation (GSR2) readiness — ISA, DMS, EDR, AEB?
  - -> proposed: **product** / scope: none (common) / section: "Regional & Regulatory Compliance"

- [ ] **TECH#131** (Compliance) -- Which type approval test labs do you partner with? Has pre-approval testing been completed?
  - -> proposed: **product** / scope: none (common) / section: "Regional & Regulatory Compliance"

- [ ] **TECH#132** (Compliance) -- How do you handle market-specific adaptation — speed units, sign database, driving-side?
  - -> proposed: **product** / scope: none (common) / section: "Regional & Regulatory Compliance"


### SECTION 18 — EMC, ENVIRONMENTAL & RELIABILITY

- [ ] **TECH#133** (EMC/Env) -- Has HALT/HASS testing been completed? What are the stress margins?
  - -> proposed: **product** / scope: none (common) / section: "EMC & Environmental Reliability"

- [ ] **TECH#134** (EMC/Env) -- Has thermal cycling testing been completed per AEC-Q100 — temperature range and cycle count?
  - -> proposed: **product** / scope: none (common) / section: "EMC & Environmental Reliability"

- [ ] **TECH#135** (EMC/Env) -- Has humidity and salt spray corrosion testing been completed?
  - -> proposed: **product** / scope: none (common) / section: "EMC & Environmental Reliability"

- [ ] **TECH#136** (EMC/Env) -- Has mechanical shock and vibration testing been completed per ISO 16750?
  - -> proposed: **product** / scope: none (common) / section: "EMC & Environmental Reliability"

- [ ] **TECH#137** (EMC/Env) -- Has radiated emissions testing been completed to CISPR 25 Class 5? Provide test report.
  - -> proposed: **product** / scope: none (common) / section: "EMC & Environmental Reliability"

- [ ] **TECH#138** (EMC/Env) -- What is your radiated immunity rating per ISO 11452?
  - -> proposed: **product** / scope: none (common) / section: "EMC & Environmental Reliability"

- [ ] **TECH#139** (EMC/Env) -- What is your ESD immunity rating per ISO 10605?
  - -> proposed: **product** / scope: none (common) / section: "EMC & Environmental Reliability"


## Perception & Function Evaluation (78 items)


### SECTION 1 — Stack Overview

- [ ] **PERC-S1#1** (Stack Overview) -- What is your primary product — a perception SDK, a full ADAS software stack, or an integrated ECU solution?
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **PERC-S1#2** (Stack Overview) -- What functions does your stack cover — AEB, ACC, LKA, LDW, DMS? For each: in production / validated but not shipped / in development.
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"

- [ ] **PERC-S1#3** (Stack Overview) -- Does your stack include the ADAS function layer (AEB decision logic, LKA torque, ACC control) or does it output a perception SceneModel only?
  - -> proposed: **general** / scope: none (common) / section: "Company Overview"


### SECTION 2 — Perception Capability

- [ ] **PERC-S1#4** (Pipeline Architecture) -- Describe your full perception pipeline end-to-end. For each perception task confirm: dedicated model / head on shared backbone / not present — and DL/ML or classical. State whether single multitask or separate models per task, and explain rationale: • Object detection  • Semantic segmentation  • Lane detection  • Monocular depth  • Freespace/drivable area  • Object tracking
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#5** (Pipeline Architecture) -- What model backbone do you use — ResNet, EfficientNet, custom, other? Design rationale at your target TOPS budget?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#6** (Object Detection) -- What object classes does your detector support? Confirm: auto-rickshaws, two-wheelers, pedestrians, cattle/animals, overloaded/non-standard vehicles.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#7** (Object Detection) -- Detection range per class under daylight — provide: class → min detection range → reliable tracking range.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#8** (Object Detection) -- Detection performance (precision / recall / mAP) on: internal test dataset / public benchmark (KITTI, nuScenes) / Indian road scenarios.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#9** (Object Detection) -- How does detection degrade under: night/low light / rain/glare / dust/haze / partial occlusion?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#10** (Object Detection) -- False positive rate on static roadside objects — walls, signboards, parked vehicles, speed bumps.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#11** (Object Detection) -- What training datasets were used? Were India-specific datasets (IDD or equivalent) included? Describe geographic and demographic diversity.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#12** (Object Detection) -- What is your ODD for object detection? Be explicit about what the stack does NOT handle.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#13** (Ghost Suppression) -- What software-side techniques does your stack use for camera ghost suppression — lens flare, windshield reflections, wet surface reflections? Describe approach and false positive rate.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#14** (Object Re-ID) -- For tracked objects that disappear due to occlusion — what is your re-identification strategy? Maximum occlusion duration after which re-ID is still reliable?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#15** (Heading Estimation) -- Does your stack estimate heading angle for detected objects? Heading estimation error at 50m?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#16** (Velocity Estimation) -- What is your relative velocity estimation accuracy for moving objects? Error in km/h at 50m and 80m.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#17** (FP/FN Catalog) -- Provide your structured false positive catalog for object detection — rain drops, sun flare, tunnel entry, shadows, road reflections. For each: mitigation and residual false positive rate.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#18** (Lane Detection) -- Lane types supported? Confirm: solid/dashed / faded/worn / temporary construction markings including orange/yellow and cone/barrier / unmarked roads / dirt/gravel.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#19** (Lane Detection) -- Lane detection F1 score under: clear markings / faded markings / night/wet roads / intersections and merges.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#20** (Lane Detection) -- How does the system behave when lane detection fails or confidence drops? Does it fail safe?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#21** (Lane Detection) -- Does lane detection include lane type classification (solid vs dashed, single vs double)? If yes, accuracy metrics.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#22** (Lane Curvature) -- Minimum road curvature radius your lane detection reliably supports. At your minimum radius, lateral position accuracy at 80m lookahead?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#23** (Lane Topology) -- Does your stack detect lane topology changes — merges, splits, forks — ahead of the vehicle? Lookahead distance?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#24** (Lane FP Catalog) -- Structured false positive catalog for lane detection — phantom lane scenarios: road cracks, tar strips, curb shadows, guard rails, wet reflections. Mitigation and residual rate.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#25** (Depth Estimation) -- What method do you use for depth/distance estimation from a monocular camera?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#26** (Depth Estimation) -- Longitudinal distance accuracy at 10m, 20m, 40m, 80m — at daylight, night, and rain.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#27** (Depth Estimation) -- Do you use ground plane assumptions (IPM/homography)? How does accuracy degrade on uneven roads, speed bumps, slopes?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#28** (Freespace) -- Does your stack output a freespace/drivable area map? Describe representation — grid, polygon, other.
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S1#29** (Freespace) -- Update rate and latency of the freespace output?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"


### None

- [ ] **PERC-S2#1** (SLR) -- Does your perception stack include Speed Limit Recognition (SLR)? If yes: • Sign types — numeric, variable message/LED VMS, end-of-limit • Detection accuracy and false positive rate • India-specific sign database / formats supported?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S2#2** (TSR) -- Does your perception stack include Traffic Signal Recognition (TSR)? If yes: • Signal states — red, amber, green, flashing, arrow • Detection range and accuracy • Perception output only, or feeds into function layer?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S2#3** (SLR/TSR) -- Are SLR and TSR dedicated models, heads on shared backbone, or separate pipeline? TOPS budget impact?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S2#4** (Quantization) -- What is your mAP at FP32 vs INT8? QAT or PTQ used for quantization? Accuracy recovery method?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S2#5** (Temporal Stability) -- Temporal detection stability — class consistency % across consecutive frames? How is flicker/bbox jitter measured?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S2#6** (Tracking Metrics) -- Tracking algorithm used (ByteTrack, DeepSORT, other)? MOTA score and tracking ID switch rate (IDSW %)?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S2#7** (Multi-Frame Fusion) -- Describe your multi-frame confidence fusion strategy — temporal voting or N-of-M frame confirmation. How is this tuned?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Perception"

- [ ] **PERC-S2#8** (Output Interface) -- What is the output of your perception stack? Describe: object list, lane boundaries, freespace, confidence scores, heading estimates, velocity estimates.
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **PERC-S2#9** (Output Interface) -- At what rate (Hz) is the perception output produced? Frame drop rate under normal and peak load?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **PERC-S2#10** (Output Interface) -- End-to-end latency from image capture to perception output?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"


### SECTION 3 — ADAS Function Layer

- [ ] **PERC-S2#11** (Function Layer) -- Which ADAS functions do you own beyond perception — AEB decision logic, LDW alert, LKA torque command, ACC set-speed control? For each: owned / must be implemented by integrator.
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **PERC-S2#12** (AEB Coverage) -- For each AEB scenario provide: max ego speed / max target speed / detection-to-brake latency / validation status: • CCRs (Stationary)  • CCRm (Decelerating)  • CCRb (Moving) • CPNCO (Ped crossing)  • CPFA (Ped ahead) • Lateral Cut-in  • Lateral Cut-out • Oncoming Car (CCFTAP)  • Oncoming Ped • Ego Turn into Car  • Ego Turn into Ped
  - -> proposed: **product** / scope: function:AEB / section: "AEB Function Detail"

- [ ] **PERC-S2#13** (ACC Cut-in) -- For ACC cut-in handling: • Min cut-in TLC your system reacts to • Distinguishes intentional lane change from gradual drift • Response latency to ACC deceleration command • Strategy: highway vs urban low-speed cut-ins
  - -> proposed: **product** / scope: function:ACC / section: "ACC Function Detail"

- [ ] **PERC-S2#14** (Cut-in Occlusion) -- Cut-in occlusion strategy — when cut-in vehicle is partially occluded before entering ego lane. How early can the system anticipate the cut-in?
  - -> proposed: **product** / scope: function:ACC / section: "ACC Function Detail"

- [ ] **PERC-S2#15** (LDW/LKA) -- For LDW/LKA — max ego speed at which function is active? Minimum speed below which it deactivates?
  - -> proposed: **product** / scope: function:LDW,LKA / section: "LDW/LKA Function Detail"

- [ ] **PERC-S2#16** (TTC Accuracy) -- TTC estimation accuracy — error in seconds at TTC = 2.0s (critical intervention window).
  - -> proposed: **product** / scope: function:AEB / section: "AEB Function Detail"

- [ ] **PERC-S2#17** (False Braking Rate) -- False braking rate in field conditions — unintended AEB events per 10,000 km of normal driving.
  - -> proposed: **product** / scope: function:AEB / section: "AEB Function Detail"

- [ ] **PERC-S2#18** (Special Scenarios) -- Does your stack detect / warn for: road debris / fallen cargo / stationary obstacles? Emergency vehicle detection (flashing lights)?
  - -> proposed: **product** / scope: function:AEB / section: "AEB Function Detail"

- [ ] **PERC-S2#19** (NCAP/AEBS) -- Have your AEB/LDW functions been tested against any NCAP or AEBS protocol? If yes, which protocol, year, and results?
  - -> proposed: **product** / scope: function:AEB / section: "AEB Function Detail"

- [ ] **PERC-S2#20** (Tunability) -- Describe tunability across four levels (supported? / tooling / partner involvement?): • Runtime config — thresholds via config file, no recompile • Platform tuning — retune per vehicle variant via calibration • Model fine-tuning — fine-tune on L&T data independently • Full retraining — full training pipeline access
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **PERC-S2#21** (Tunability) -- Which parameters can L&T modify via config files — without recompiling or involving your team? Provide a representative list.
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"


### SECTION 4 — DMS Capability

- [ ] **PERC-S2#22** (DMS) -- Do you have a DMS stack? Developed in-house or sourced from a sub-vendor?
  - -> proposed: **product** / scope: function:DMS / section: "DMS Function Detail"

- [ ] **PERC-S2#23** (DMS) -- What sensor does your DMS require — RGB, IR, or either? Recommended spec: resolution, FPS, wavelength.
  - -> proposed: **product** / scope: function:DMS / section: "DMS Function Detail"

- [ ] **PERC-S2#24** (DMS) -- Driver states detected? Confirm: • Eye closure / blink rate / drowsiness (PERCLOS) • Gaze direction / distraction  • Yawning  • Head pose • Phone usage  • Smoking  • Eating/drinking • Driver presence / absence • Child presence in vehicle (OMS)
  - -> proposed: **product** / scope: function:DMS / section: "DMS Function Detail"

- [ ] **PERC-S2#25** (DMS) -- Response latency from driver state change to DMS alert output?
  - -> proposed: **product** / scope: function:DMS / section: "DMS Function Detail"

- [ ] **PERC-S2#26** (DMS) -- False positive rate for drowsiness detection in normal driving — target: less than 1 per hour?
  - -> proposed: **product** / scope: function:DMS / section: "DMS Function Detail"

- [ ] **PERC-S2#27** (DMS) -- Does DMS run independently or is it architecturally integrated with the front safety perception stack?
  - -> proposed: **product** / scope: function:DMS / section: "DMS Function Detail"

- [ ] **PERC-S2#28** (DMS) -- If integrated: combined TOPS budget for front safety + DMS simultaneously on the same SoC?
  - -> proposed: **product** / scope: function:DMS / section: "DMS Function Detail"

- [ ] **PERC-S2#29** (DMS) -- If separate: DMS TOPS budget in isolation, and minimum SoC spec it has run on?
  - -> proposed: **product** / scope: function:DMS / section: "DMS Function Detail"

- [ ] **PERC-S2#30** (DMS Robustness) -- How robust is your DMS to accessories — sunglasses (various tint levels), face masks, hats, scarves?
  - -> proposed: **product** / scope: function:DMS / section: "DMS Function Detail"

- [ ] **PERC-S2#31** (DMS Demographics) -- Has your DMS been tested for demographic robustness — equal performance across skin tones and facial structures?
  - -> proposed: **product** / scope: function:DMS / section: "DMS Function Detail"


### SECTION 5 — Hardware and Compute

- [x] **PERC-S3#1** (Hardware) -- List all SoCs your stack runs on (production or validated). For each: SoC name / TOPS rating / functions running.
  - DROPPED (confirmed duplicate): Duplicate of TECH#17 (SoC platform/TOPS) -- merged into Architecture & Platform via TECH#17

- [ ] **PERC-S3#2** (Hardware) -- Total TOPS consumed by your full stack (perception + ADAS functions) at nominal operation?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **PERC-S3#3** (Hardware) -- Minimum TOPS required to run your ADAS functions at acceptable performance?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **PERC-S3#4** (Hardware) -- Can perception + ADAS functions fit within 2 TOPS? If yes, evidence. If no, what is the minimum?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **PERC-S3#5** (Hardware) -- Have you ported to any TI SoC (TDA4VM, AM62A, or equivalent)? Performance data or estimated effort?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **PERC-S3#6** (Hardware) -- Is your inference pipeline optimized for TIDL? If not, what runtime do you use?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **PERC-S3#7** (Hardware) -- Quantization level — FP32, FP16, INT8? Accuracy delta from FP32 baseline to deployment precision?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **PERC-S3#8** (Hardware) -- Memory footprint — model weights + runtime memory?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"

- [ ] **PERC-S3#9** (Hardware) -- Minimum camera specification your stack is validated on — resolution, FPS, sensor type?
  - -> proposed: **product** / scope: none (common) / section: "Architecture & Platform"


### SECTION 6 — Integration and Interface

- [x] **PERC-S3#10** (Integration) -- Is your stack compatible with AUTOSAR Adaptive for production deployment?
  - DROPPED (confirmed duplicate): Duplicate of TECH#22 (AUTOSAR Classic/Adaptive support)

- [ ] **PERC-S3#11** (Integration) -- Any ISP dependency — specific ISP or camera module required? If yes, which ones?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [ ] **PERC-S3#12** (Integration) -- Do you provide calibration tooling (intrinsic, extrinsic, homography)? Process and time per vehicle variant?
  - -> proposed: **product** / scope: sensor:camera / section: "Camera Subsystem"

- [x] **PERC-S3#13** (Integration) -- Do you provide a SIL environment? If yes, what simulator — CarMaker, CARLA, LGSVL, or other?
  - DROPPED (confirmed duplicate): Duplicate of TECH#57-59 (SIL/HIL capability + simulation tool integration)


### SECTION 7 — Known Limitations and India Readiness

- [ ] **PERC-S3#14** (Limitations) -- Known limitations of your current stack that you are actively working to resolve?
  - -> proposed: **product** / scope: none (common) / section: "Known Limitations & India Readiness"

- [ ] **PERC-S3#15** (Limitations) -- Are there scenarios validated only in limited conditions — highway only, specific weather, specific geographies?
  - -> proposed: **product** / scope: none (common) / section: "Known Limitations & India Readiness"

- [ ] **PERC-S3#16** (India Readiness) -- Validated on Indian roads? If yes: cities/road types / India-specific scenarios including speed breakers / performance data?
  - -> proposed: **product** / scope: none (common) / section: "Known Limitations & India Readiness"

- [ ] **PERC-S3#17** (India Readiness) -- What India-specific edge cases has your stack been optimized for? Be specific — not marketing language.
  - -> proposed: **product** / scope: none (common) / section: "Known Limitations & India Readiness"

- [ ] **PERC-S3#18** (India Readiness) -- What challenging perception problems has your stack solved that are typically unsolved at your price/TOPS point?
  - -> proposed: **product** / scope: none (common) / section: "Known Limitations & India Readiness"
