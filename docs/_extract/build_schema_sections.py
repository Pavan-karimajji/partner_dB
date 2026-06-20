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

# Sort questions so they're grouped by section in SECTION_ORDER, preserving
# original relative order within each section, then reassign sequential ids.
sec_index = {sid: i for i, sid in enumerate(SECTION_ORDER)}
questions.sort(key=lambda q: sec_index[q['sectionId']])
for i, q in enumerate(questions, start=1):
    q['id'] = i

detail_sections = []
for sid in SECTION_ORDER:
    label, target, scope = SECTIONS[sid]
    entry = {'id': sid, 'category': target, 'label': label}
    entry['scope'] = None if scope is None else {'type': scope[0], 'keys': scope[1]}
    detail_sections.append(entry)

schema = json.load(open('schema.json', encoding='utf-8'))
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
