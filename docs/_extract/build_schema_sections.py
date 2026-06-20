import json
from collections import OrderedDict

tech = json.load(open('docs/_extract/combined_tech.json', encoding='utf-8'))
perc = json.load(open('docs/_extract/combined_perc.json', encoding='utf-8'))

# (section_id, section_label, target, scope) -- scope is None or (type, [keys])
SECTIONS = {
    'gen-company-overview':      ('Company Overview', 'general', None),
    'gen-validation-test':       ('Validation & Test Infrastructure', 'general', None),
    'gen-funcsafety-cyber':      ('Functional Safety & Cybersecurity', 'general', None),
    'prod-compute-hw':           ('Compute & Hardware', 'product', None),
    'prod-sw-arch':              ('Software Architecture', 'product', None),
    'prod-pipeline-runtime':     ('Pipeline & Runtime', 'product', None),
    'prod-power':                ('Power & Ignition Management', 'product', None),
    'prod-camera-sensor-optics': ('Camera: Image Sensor & Optics', 'product', ('sensor', ['camera'])),
    'prod-camera-isp':           ('Camera: ISP & Image Quality', 'product', ('sensor', ['camera'])),
    'prod-camera-robustness':    ('Camera: Robustness & Calibration', 'product', ('sensor', ['camera'])),
    'prod-hw-robustness':        ('HW Robustness & Components', 'product', None),
    'prod-camperc-pipeline':     ('Camera Perception: Pipeline Architecture', 'product', ('sensor', ['camera'])),
    'prod-camperc-objdet':       ('Camera Perception: Object Detection', 'product', ('sensor', ['camera'])),
    'prod-camperc-lane':         ('Camera Perception: Lane Detection', 'product', ('sensor', ['camera'])),
    'prod-camperc-depth':        ('Camera Perception: Depth & Freespace', 'product', ('sensor', ['camera'])),
    'prod-camperc-slrtsr':       ('Camera Perception: Speed Limit & Traffic Sign Recognition', 'product', ('sensor', ['camera'])),
    'prod-camperc-modelquality': ('Camera Perception: Model Quality & Temporal Stability', 'product', ('sensor', ['camera'])),
    'prod-camperc-output':       ('Camera Perception: Output Interface', 'product', ('sensor', ['camera'])),
    'prod-radar-subsystem':      ('Radar Subsystem', 'product', ('sensor', ['radar'])),
    'prod-fusion-subsystem':     ('Fusion Subsystem', 'product', ('sensor', ['fusion'])),
    'prod-func-aeb':             ('AEB Function Detail', 'product', ('function', ['AEB'])),
    'prod-func-acc':             ('ACC Function Detail', 'product', ('function', ['ACC'])),
    'prod-func-ldwlka':          ('LDW/LKA Function Detail', 'product', ('function', ['LDW', 'LKA'])),
    'prod-func-lca':             ('LCA Function Detail', 'product', ('function', ['LCA'])),
    'prod-func-bsd':             ('BSD Function Detail', 'product', ('function', ['BSD'])),
    'prod-func-rcta':            ('RCTA Function Detail', 'product', ('function', ['RCTA'])),
    'prod-func-mois':            ('MOIS Function Detail', 'product', ('function', ['MOIS'])),
    'prod-func-dms':             ('DMS Function Detail', 'product', ('function', ['DMS'])),
    'prod-production-lifecycle': ('Production Readiness & Lifecycle', 'product', None),
    'prod-sw-quality':           ('Software Quality', 'product', None),
    'prod-hmi':                  ('HMI & Driver Interaction', 'product', None),
    'prod-compliance':           ('Regional & Regulatory Compliance', 'product', None),
    'prod-emc-env':              ('EMC & Environmental Reliability', 'product', None),
    'prod-limitations-india':    ('Known Limitations & India Readiness', 'product', None),
}

# Section order (controls order of sections within General / Product categories)
SECTION_ORDER = [
    'gen-company-overview', 'gen-validation-test', 'gen-funcsafety-cyber',
    'prod-compute-hw', 'prod-sw-arch', 'prod-pipeline-runtime', 'prod-power',
    'prod-camera-sensor-optics', 'prod-camera-isp', 'prod-camera-robustness',
    'prod-radar-subsystem', 'prod-fusion-subsystem',
    'prod-hw-robustness',
    'prod-camperc-pipeline', 'prod-camperc-objdet', 'prod-camperc-lane',
    'prod-camperc-depth', 'prod-camperc-slrtsr', 'prod-camperc-modelquality',
    'prod-camperc-output',
    'prod-func-aeb', 'prod-func-acc', 'prod-func-ldwlka', 'prod-func-lca',
    'prod-func-bsd', 'prod-func-rcta', 'prod-func-mois', 'prod-func-dms',
    'prod-production-lifecycle', 'prod-sw-quality', 'prod-hmi',
    'prod-compliance', 'prod-emc-env', 'prod-limitations-india',
]
assert set(SECTION_ORDER) == set(SECTIONS.keys())

TECH_CATEGORY_SECTION = {
    'Corporate': 'gen-company-overview', 'Track Record': 'gen-company-overview',
    'Certifications': 'gen-company-overview', 'Roadmap': 'gen-company-overview',
    'Compute': 'prod-compute-hw',
    'SW Arch': 'prod-sw-arch',
    'Pipeline': 'prod-pipeline-runtime',
    'Power': 'prod-power',
    'Sensor': 'prod-camera-sensor-optics',
    'ISP': 'prod-camera-isp',
    'Robustness': 'prod-hw-robustness',   # per-item overrides below pull camera-specific ones out
    'Components': 'prod-hw-robustness',
    'SIL/HIL': 'gen-validation-test', 'Data': 'gen-validation-test',
    'CI/CD': 'gen-validation-test', 'Real-World': 'gen-validation-test',
    'FuSa': 'gen-funcsafety-cyber', 'Safety Arch': 'gen-funcsafety-cyber',
    'SOTIF': 'gen-funcsafety-cyber', 'Fault Inject': 'gen-funcsafety-cyber',
    'Cybersec': 'gen-funcsafety-cyber', 'Privacy': 'gen-funcsafety-cyber',
    'Production': 'prod-production-lifecycle', 'OTA': 'prod-production-lifecycle',
    'Lifecycle': 'prod-production-lifecycle',  # TECH#109 overridden below
    'SW Quality': 'prod-sw-quality',
    'HMI': 'prod-hmi',
    'Compliance': 'prod-compliance',
    'EMC/Env': 'prod-emc-env',
}

PERC_CATEGORY_SECTION = {
    'Stack Overview': 'gen-company-overview',
    'Pipeline Architecture': 'prod-camperc-pipeline',
    'Object Detection': 'prod-camperc-objdet', 'Ghost Suppression': 'prod-camperc-objdet',
    'Object Re-ID': 'prod-camperc-objdet', 'Heading Estimation': 'prod-camperc-objdet',
    'Velocity Estimation': 'prod-camperc-objdet', 'FP/FN Catalog': 'prod-camperc-objdet',
    'Lane Detection': 'prod-camperc-lane', 'Lane Curvature': 'prod-camperc-lane',
    'Lane Topology': 'prod-camperc-lane', 'Lane FP Catalog': 'prod-camperc-lane',
    'Depth Estimation': 'prod-camperc-depth', 'Freespace': 'prod-camperc-depth',
    'SLR': 'prod-camperc-slrtsr', 'TSR': 'prod-camperc-slrtsr', 'SLR/TSR': 'prod-camperc-slrtsr',
    'Quantization': 'prod-camperc-modelquality', 'Temporal Stability': 'prod-camperc-modelquality',
    'Tracking Metrics': 'prod-camperc-modelquality', 'Multi-Frame Fusion': 'prod-camperc-modelquality',
    'Output Interface': 'prod-camperc-output', 'Function Layer': 'prod-camperc-output',
    'AEB Coverage': 'prod-func-aeb', 'TTC Accuracy': 'prod-func-aeb',
    'False Braking Rate': 'prod-func-aeb', 'Special Scenarios': 'prod-func-aeb',
    'NCAP/AEBS': 'prod-func-aeb',
    'ACC Cut-in': 'prod-func-acc', 'Cut-in Occlusion': 'prod-func-acc',
    'LDW/LKA': 'prod-func-ldwlka',
    'Tunability': 'prod-compute-hw',
    'DMS': 'prod-func-dms', 'DMS Robustness': 'prod-func-dms', 'DMS Demographics': 'prod-func-dms',
    'Hardware': 'prod-compute-hw',
    'Limitations': 'prod-limitations-india', 'India Readiness': 'prod-limitations-india',
}

DROP = {'PERC-S3#1', 'PERC-S3#10', 'PERC-S3#13'}

OVERRIDE_SECTION = {
    'PERC-S3#11': 'prod-camera-robustness',  # ISP dependency / camera module required
    'PERC-S3#12': 'prod-camera-robustness',  # calibration tooling (intrinsic, extrinsic, homography)
    'TECH#49':    'prod-camera-robustness',  # IP rating for camera modules
    'TECH#52':    'prod-camera-robustness',  # lens contamination/blockage detection
    'TECH#53':    'prod-camera-robustness',  # calibration drift over lifetime
    'TECH#109':   'prod-camera-robustness',  # spare parts strategy (camera modules)
}

def resolve_section(ref, category, table):
    if ref in OVERRIDE_SECTION:
        return OVERRIDE_SECTION[ref]
    return table[category]

questions = []
qid = 1
for item in tech:
    if item['ref'] in DROP:
        continue
    sec = resolve_section(item['ref'], item['category'], TECH_CATEGORY_SECTION)
    questions.append({'id': qid, 'sectionId': sec, 'text': item['text'], 'sourceRef': item['ref']})
    qid += 1
for item in perc:
    if item['ref'] in DROP:
        continue
    sec = resolve_section(item['ref'], item['category'], PERC_CATEGORY_SECTION)
    questions.append({'id': qid, 'sectionId': sec, 'text': item['text'], 'sourceRef': item['ref']})
    qid += 1

# Manually-authored questions for sections the source spreadsheets never
# covered (radar/fusion/LCA/BSD/RCTA/MOIS). Drafted to mirror the phrasing
# style of the migrated questions, reviewed and approved by the user.
NEW_QUESTIONS = {
    'prod-radar-subsystem': [
        "What radar frequency band(s) do you use — 24GHz, 77GHz, 79GHz? Justify the choice for your target use case.",
        "What radar type(s) are deployed — long-range (LRR), mid-range (MRR), short-range (SRR)? How many units and where are they mounted (front/rear/corner)?",
        "What is the detection range, azimuth FoV, and elevation FoV for each radar unit?",
        "What is the angular resolution and ability to separate closely-spaced targets (e.g. two pedestrians side by side)?",
        "What object classes can your radar reliably classify (vehicle, pedestrian, cyclist, static clutter), and what is the classification accuracy?",
        "How do you handle radar-to-radar interference in dense traffic or multi-vehicle scenarios?",
        "What is your radar's performance in adverse weather (rain, fog, dust) compared to clear conditions — provide measured data.",
        "Is the radar hardware AEC-Q100 qualified? What automotive radar chipset/MMIC do you use?",
        "Describe your radar calibration process — boresight alignment, mounting tolerance, recalibration triggers.",
        "What is the radar's update rate (frame rate) and end-to-end latency from detection to output?",
    ],
    'prod-fusion-subsystem': [
        "What is your sensor fusion architecture — low-level (raw data), mid-level (feature), or high-level (object/track) fusion?",
        "Which sensor combinations does your fusion stack support — camera+radar, camera+radar+lidar, other?",
        "What fusion algorithm do you use — Kalman filter variant, particle filter, learned/deep fusion model, rule-based?",
        "How do you time-synchronize data from different sensors? What is the maximum tolerated time skew?",
        "How does the fusion stack handle conflicting detections between sensors (e.g. radar detects an object camera doesn't, or vice versa)?",
        "What is your fallback behavior when one sensor degrades or fails (e.g. camera blocked, radar occluded)?",
        "How is per-sensor confidence/uncertainty represented and propagated through the fusion output?",
        "Describe your track management — how object IDs are maintained, merged, or split across sensor inputs over time.",
    ],
    'prod-func-lca': [
        "What sensors does your LCA function use — rear/side radar only, or camera+radar fusion?",
        "What is the detection range and field of view covered for adjacent-lane traffic, front and rear of the ego vehicle?",
        "What is the minimum relative closing speed your system reliably detects for an approaching vehicle in the target lane?",
        "What is your false alert rate in field conditions (alerts per X km)?",
        "Describe your warning strategy and timing — visual/audio/haptic, and at what time-to-collision threshold?",
    ],
    'prod-func-bsd': [
        "What sensors and how many units cover the blind spot detection zones (per side)?",
        "Does your blind spot zone definition meet a specific standard (e.g. Euro NCAP, ISO)? Describe the covered zone dimensions.",
        "What object classes are detected in the blind spot (vehicle, motorcycle/two-wheeler, cyclist)?",
        "How does the system behave when towing a trailer or in multi-axle configurations?",
        "What is your false positive / false negative rate in field testing?",
    ],
    'prod-func-rcta': [
        "What sensors and detection range/FoV are used for rear cross-traffic detection?",
        "What time-to-collision threshold triggers an alert while reversing?",
        "Is RCTA integrated with automatic braking (RCTB), or warning-only? Describe the response strategy.",
        "How does the system perform in typical parking/reversing scenarios — obstructed views, perpendicular vs. angled parking?",
    ],
    'prod-func-mois': [
        "What sensors detect moving objects in the close-range blind zone around/beneath the vehicle (front-low, side-low) that the driver cannot see directly?",
        "What is the minimum detectable object size and height — can it detect a two-wheeler or pedestrian very close to or partially under the vehicle body?",
        "What is the detection range and coverage zone for this near-vehicle blind area — front, sides, or both?",
        "How does the system alert or intervene when a moving object is detected in this zone, while stationary vs. while starting to move?",
        "Is this function specifically designed for large/commercial vehicles (trucks, buses) where driver sightlines are most limited? Describe the target vehicle classes.",
        "What is your false alert rate, and what validation evidence exists for this scenario (test tracks, replicated real-world incidents)?",
    ],
}
for sec_id, texts in NEW_QUESTIONS.items():
    for text in texts:
        questions.append({'id': qid, 'sectionId': sec_id, 'text': text, 'sourceRef': None})
        qid += 1

# Sort questions so they're grouped by section in SECTION_ORDER, preserving
# original relative order within each section, then reassign sequential ids.
sec_index = {sid: i for i, sid in enumerate(SECTION_ORDER)}
questions.sort(key=lambda q: sec_index[q['sectionId']])
for i, q in enumerate(questions, start=1):
    q['id'] = i

# Management-facing domains -- a coarser grouping than the 34 detailSections,
# used for the Comparison heatmap and any future management rollup. Every
# section maps to exactly one domain. "Patents & Innovation" deliberately has
# no sections mapped to it -- it's derived from partner.patents[] instead.
DOMAINS = [
    {'id': 'company-background',   'label': 'Company Background'},
    {'id': 'perception-function',  'label': 'Perception Stack & Function Maturity'},
    {'id': 'regulation-compliance','label': 'Regulation & Compliance'},
    {'id': 'safety-cyber',          'label': 'Safety & Cyber Security'},
    {'id': 'hardware-capability',  'label': 'Hardware Capability'},
    {'id': 'patents-innovation',   'label': 'Patents & Innovation'},
]

SECTION_DOMAIN = {
    'gen-company-overview': 'company-background',
    'prod-production-lifecycle': 'company-background',
    'gen-validation-test': 'perception-function',
    'prod-camperc-pipeline': 'perception-function', 'prod-camperc-objdet': 'perception-function',
    'prod-camperc-lane': 'perception-function', 'prod-camperc-depth': 'perception-function',
    'prod-camperc-slrtsr': 'perception-function', 'prod-camperc-modelquality': 'perception-function',
    'prod-camperc-output': 'perception-function',
    'prod-func-aeb': 'perception-function', 'prod-func-acc': 'perception-function',
    'prod-func-ldwlka': 'perception-function', 'prod-func-lca': 'perception-function',
    'prod-func-bsd': 'perception-function', 'prod-func-rcta': 'perception-function',
    'prod-func-mois': 'perception-function', 'prod-func-dms': 'perception-function',
    'prod-sw-quality': 'perception-function',
    'prod-hmi': 'perception-function',
    'prod-compliance': 'regulation-compliance', 'prod-emc-env': 'regulation-compliance',
    'prod-limitations-india': 'regulation-compliance',
    'gen-funcsafety-cyber': 'safety-cyber',
    'prod-compute-hw': 'hardware-capability', 'prod-sw-arch': 'hardware-capability',
    'prod-pipeline-runtime': 'hardware-capability', 'prod-power': 'hardware-capability',
    'prod-camera-sensor-optics': 'hardware-capability', 'prod-camera-isp': 'hardware-capability',
    'prod-camera-robustness': 'hardware-capability', 'prod-radar-subsystem': 'hardware-capability',
    'prod-fusion-subsystem': 'hardware-capability', 'prod-hw-robustness': 'hardware-capability',
}
assert set(SECTION_DOMAIN.keys()) == set(SECTION_ORDER)

# Per-question priority for customer-meeting prep: 'high' = cover live in the
# first technical meeting, 'medium' = cover if time allows, 'low' = fine as a
# written follow-up. Assigned by reading each question's content, not by
# keyword heuristic. Keyed by the question's final id (1-252) -- stable as
# long as SECTION_ORDER / tech / perc / NEW_QUESTIONS content above doesn't
# change order.
QUESTION_PRIORITY = {
    1: 'high', 2: 'medium', 3: 'high', 4: 'low', 5: 'high', 6: 'medium', 7: 'medium', 8: 'medium',
    9: 'low', 10: 'high', 11: 'medium', 12: 'low', 13: 'medium', 14: 'medium', 15: 'low', 16: 'medium',
    17: 'high', 18: 'high', 19: 'high',
    20: 'medium', 21: 'medium', 22: 'low', 23: 'low', 24: 'low', 25: 'medium', 26: 'low', 27: 'low',
    28: 'low', 29: 'low', 30: 'low', 31: 'low', 32: 'low', 33: 'medium', 34: 'medium', 35: 'medium', 36: 'low',
    37: 'high', 38: 'medium', 39: 'low', 40: 'medium', 41: 'low', 42: 'medium', 43: 'high', 44: 'medium',
    45: 'medium', 46: 'medium', 47: 'high', 48: 'low', 49: 'low', 50: 'low', 51: 'medium', 52: 'medium',
    53: 'low', 54: 'low', 55: 'low', 56: 'low', 57: 'high', 58: 'low', 59: 'medium', 60: 'low', 61: 'low', 62: 'low',
    63: 'high', 64: 'low', 65: 'medium', 66: 'medium', 67: 'low', 68: 'medium', 69: 'medium', 70: 'high',
    71: 'medium', 72: 'medium', 73: 'medium', 74: 'low', 75: 'low', 76: 'low', 77: 'medium',
    78: 'high', 79: 'medium', 80: 'low', 81: 'medium', 82: 'low', 83: 'low',
    84: 'high', 85: 'medium', 86: 'low', 87: 'low', 88: 'medium',
    89: 'low', 90: 'low',
    91: 'high', 92: 'medium', 93: 'medium', 94: 'medium', 95: 'medium', 96: 'low', 97: 'medium', 98: 'low',
    99: 'low', 100: 'low', 101: 'low', 102: 'medium', 103: 'low',
    104: 'medium', 105: 'medium', 106: 'low', 107: 'low', 108: 'low', 109: 'low',
    110: 'high', 111: 'high', 112: 'medium', 113: 'low', 114: 'medium', 115: 'low', 116: 'medium',
    117: 'low', 118: 'low', 119: 'low',
    120: 'high', 121: 'high', 122: 'medium', 123: 'low', 124: 'medium', 125: 'medium', 126: 'low', 127: 'low',
    128: 'medium', 129: 'low', 130: 'low', 131: 'low', 132: 'low', 133: 'low',
    134: 'high', 135: 'low',
    136: 'high', 137: 'medium', 138: 'high', 139: 'high', 140: 'medium', 141: 'high', 142: 'medium',
    143: 'low', 144: 'low', 145: 'low', 146: 'medium', 147: 'low',
    148: 'medium', 149: 'medium', 150: 'medium', 151: 'low', 152: 'low', 153: 'low', 154: 'low',
    155: 'medium', 156: 'high', 157: 'low', 158: 'medium', 159: 'low',
    160: 'medium', 161: 'medium', 162: 'low',
    163: 'low', 164: 'low', 165: 'low', 166: 'low',
    167: 'medium', 168: 'medium', 169: 'medium', 170: 'high',
    171: 'high', 172: 'medium', 173: 'high', 174: 'medium', 175: 'high',
    176: 'high', 177: 'medium',
    178: 'medium',
    179: 'high', 180: 'medium', 181: 'medium', 182: 'medium', 183: 'medium',
    184: 'high', 185: 'medium', 186: 'medium', 187: 'low', 188: 'medium',
    189: 'high', 190: 'medium', 191: 'medium', 192: 'low',
    193: 'high', 194: 'medium', 195: 'medium', 196: 'medium', 197: 'medium', 198: 'low',
    199: 'high', 200: 'medium', 201: 'high', 202: 'medium', 203: 'medium', 204: 'medium',
    205: 'low', 206: 'low', 207: 'medium', 208: 'medium',
    209: 'high', 210: 'low', 211: 'low', 212: 'low', 213: 'medium', 214: 'low', 215: 'low',
    216: 'low', 217: 'low', 218: 'low', 219: 'medium', 220: 'high',
    221: 'medium', 222: 'low', 223: 'low', 224: 'low', 225: 'low', 226: 'medium', 227: 'low', 228: 'low',
    229: 'medium', 230: 'medium', 231: 'low', 232: 'low', 233: 'low',
    234: 'high', 235: 'high', 236: 'high', 237: 'medium', 238: 'medium', 239: 'low', 240: 'low',
    241: 'low', 242: 'low', 243: 'low', 244: 'low', 245: 'low', 246: 'low', 247: 'low',
    248: 'high', 249: 'medium', 250: 'high', 251: 'medium', 252: 'medium',
}
assert set(QUESTION_PRIORITY.keys()) == set(range(1, len(questions) + 1)), \
    f"QUESTION_PRIORITY must cover exactly questions 1..{len(questions)}"
for q in questions:
    q['priority'] = QUESTION_PRIORITY[q['id']]

detail_sections = []
for sid in SECTION_ORDER:
    label, target, scope = SECTIONS[sid]
    entry = {'id': sid, 'category': target, 'label': label, 'domain': SECTION_DOMAIN[sid]}
    entry['scope'] = None if scope is None else {'type': scope[0], 'keys': scope[1]}
    detail_sections.append(entry)

schema = json.load(open('schema.json', encoding='utf-8'))
schema['domains'] = DOMAINS
schema['detailSections'] = detail_sections
schema['detailQuestions'] = questions

with open('schema.json', 'w', encoding='utf-8') as f:
    json.dump(schema, f, ensure_ascii=False, indent=2)
    f.write('\n')

print('Sections:', len(detail_sections))
print('Questions:', len(questions))
counts = {}
for q in questions:
    counts[q['sectionId']] = counts.get(q['sectionId'], 0) + 1
for sid in SECTION_ORDER:
    print(' ', sid, '->', counts.get(sid, 0), 'questions')
