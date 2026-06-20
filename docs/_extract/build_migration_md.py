import json

tech = json.load(open('docs/_extract/combined_tech.json', encoding='utf-8'))
perc = json.load(open('docs/_extract/combined_perc.json', encoding='utf-8'))

TECH_RULES = {
    'Corporate':     ('general', None, 'Company Overview'),
    'Track Record':  ('general', None, 'Company Overview'),
    'Certifications':('general', None, 'Company Overview'),
    'Roadmap':       ('general', None, 'Company Overview'),
    'Compute':       ('product', None, 'Architecture & Platform'),
    'SW Arch':       ('product', None, 'Architecture & Platform'),
    'Pipeline':      ('product', None, 'Architecture & Platform'),
    'Power':         ('product', None, 'Architecture & Platform'),
    'Sensor':        ('product', ('sensor', ['camera']), 'Camera Subsystem'),
    'ISP':           ('product', ('sensor', ['camera']), 'Camera Subsystem'),
    'Robustness':    ('product', None, 'HW Robustness & Components'),
    'Components':    ('product', None, 'HW Robustness & Components'),
    'SIL/HIL':       ('general', None, 'Validation & Test Infrastructure'),
    'Data':          ('general', None, 'Validation & Test Infrastructure'),
    'CI/CD':         ('general', None, 'Validation & Test Infrastructure'),
    'Real-World':    ('general', None, 'Validation & Test Infrastructure'),
    'FuSa':          ('general', None, 'Functional Safety & Cybersecurity'),
    'Safety Arch':   ('general', None, 'Functional Safety & Cybersecurity'),
    'SOTIF':         ('general', None, 'Functional Safety & Cybersecurity'),
    'Fault Inject':  ('general', None, 'Functional Safety & Cybersecurity'),
    'Cybersec':      ('general', None, 'Functional Safety & Cybersecurity'),
    'Privacy':       ('general', None, 'Functional Safety & Cybersecurity'),
    'Production':    ('product', None, 'Production Readiness & Lifecycle'),
    'OTA':           ('product', None, 'Production Readiness & Lifecycle'),
    'Lifecycle':     ('product', None, 'Production Readiness & Lifecycle'),  # TECH#109 overridden below -> Camera Subsystem
    'SW Quality':    ('product', None, 'Software Quality'),
    'HMI':           ('product', None, 'HMI & Driver Interaction'),
    'Compliance':    ('product', None, 'Regional & Regulatory Compliance'),
    'EMC/Env':       ('product', None, 'EMC & Environmental Reliability'),
}

PERC_RULES = {
    'Stack Overview':       ('general', None, 'Company Overview'),
    'Pipeline Architecture':('product', ('sensor', ['camera']), 'Camera Perception'),
    'Object Detection':     ('product', ('sensor', ['camera']), 'Camera Perception'),
    'Ghost Suppression':    ('product', ('sensor', ['camera']), 'Camera Perception'),
    'Object Re-ID':         ('product', ('sensor', ['camera']), 'Camera Perception'),
    'Heading Estimation':   ('product', ('sensor', ['camera']), 'Camera Perception'),
    'Velocity Estimation':  ('product', ('sensor', ['camera']), 'Camera Perception'),
    'FP/FN Catalog':        ('product', ('sensor', ['camera']), 'Camera Perception'),
    'Lane Detection':       ('product', ('sensor', ['camera']), 'Camera Perception'),
    'Lane Curvature':       ('product', ('sensor', ['camera']), 'Camera Perception'),
    'Lane Topology':        ('product', ('sensor', ['camera']), 'Camera Perception'),
    'Lane FP Catalog':      ('product', ('sensor', ['camera']), 'Camera Perception'),
    'Depth Estimation':     ('product', ('sensor', ['camera']), 'Camera Perception'),
    'Freespace':            ('product', ('sensor', ['camera']), 'Camera Perception'),
    'SLR':                  ('product', ('sensor', ['camera']), 'Camera Perception'),
    'TSR':                  ('product', ('sensor', ['camera']), 'Camera Perception'),
    'SLR/TSR':              ('product', ('sensor', ['camera']), 'Camera Perception'),
    'Quantization':         ('product', ('sensor', ['camera']), 'Camera Perception'),
    'Temporal Stability':   ('product', ('sensor', ['camera']), 'Camera Perception'),
    'Tracking Metrics':     ('product', ('sensor', ['camera']), 'Camera Perception'),
    'Multi-Frame Fusion':   ('product', ('sensor', ['camera']), 'Camera Perception'),
    'Output Interface':     ('product', None, 'Architecture & Platform'),
    'Function Layer':       ('product', None, 'Architecture & Platform'),
    'AEB Coverage':         ('product', ('function', ['AEB']), 'AEB Function Detail'),
    'ACC Cut-in':           ('product', ('function', ['ACC']), 'ACC Function Detail'),
    'Cut-in Occlusion':     ('product', ('function', ['ACC']), 'ACC Function Detail'),
    'LDW/LKA':              ('product', ('function', ['LDW', 'LKA']), 'LDW/LKA Function Detail'),
    'TTC Accuracy':         ('product', ('function', ['AEB']), 'AEB Function Detail'),
    'False Braking Rate':   ('product', ('function', ['AEB']), 'AEB Function Detail'),
    'Special Scenarios':    ('product', ('function', ['AEB']), 'AEB Function Detail'),
    'NCAP/AEBS':            ('product', ('function', ['AEB']), 'AEB Function Detail'),
    'Tunability':           ('product', None, 'Architecture & Platform'),
    'DMS':                  ('product', ('function', ['DMS']), 'DMS Function Detail'),
    'DMS Robustness':       ('product', ('function', ['DMS']), 'DMS Function Detail'),
    'DMS Demographics':     ('product', ('function', ['DMS']), 'DMS Function Detail'),
    'Hardware':              ('product', None, 'Architecture & Platform'),  # merged with TECH Compute; PERC-S3#1 dropped as duplicate (see OVERRIDES)
    'Integration':           ('product', None, 'Architecture & Platform'),  # mostly dissolved into overrides (camera-scoped / dropped duplicates)
    'Limitations':           ('product', None, 'Known Limitations & India Readiness'),
    'India Readiness':       ('product', None, 'Known Limitations & India Readiness'),
}

# Per-item overrides: refs that need a different placement than their
# category's default rule, or should be dropped as a confirmed duplicate
# of another question. Resolved via explicit user decisions -- see
# plan.md "Stage 2" section for the rationale behind each.
OVERRIDES = {
    # Duplicate of TECH#17 (Target SoC platform(s) and TOPS rating)
    'PERC-S3#1':  ('DROP', None, 'Duplicate of TECH#17 (SoC platform/TOPS) -- merged into Architecture & Platform via TECH#17'),
    # Duplicate of TECH#22 (AUTOSAR Classic/Adaptive support)
    'PERC-S3#10': ('DROP', None, 'Duplicate of TECH#22 (AUTOSAR Classic/Adaptive support)'),
    # Duplicate of TECH#57-59 (SIL/HIL capability + simulation tool integration)
    'PERC-S3#13': ('DROP', None, 'Duplicate of TECH#57-59 (SIL/HIL capability + simulation tool integration)'),
    # Explicitly camera/ISP-specific despite sitting in generic "Integration" category
    'PERC-S3#11': ('product', ('sensor', ['camera']), 'Camera Subsystem'),
    'PERC-S3#12': ('product', ('sensor', ['camera']), 'Camera Subsystem'),
    # Robustness/Components item-level split
    'TECH#49': ('product', ('sensor', ['camera']), 'Camera Subsystem'),  # IP rating for camera modules
    'TECH#52': ('product', ('sensor', ['camera']), 'Camera Subsystem'),  # Lens contamination/blockage detection
    'TECH#53': ('product', ('sensor', ['camera']), 'Camera Subsystem'),  # Calibration drift over lifetime
    # Explicitly camera-scoped lifecycle item
    'TECH#109': ('product', ('sensor', ['camera']), 'Camera Subsystem'),  # Spare parts strategy (camera modules)
}

def render_item(item, rules):
    cat = item['category']
    ref = item['ref']
    text = (item['text'] or '').replace('\n', ' ')
    rule = OVERRIDES.get(ref, rules.get(cat))
    if rule is None:
        return "- [ ] **{0}** ({1}) -- {2}\n  - WARNING NEEDS REVIEW: no mapping rule defined for category '{1}'\n".format(ref, cat, text)
    target, scope, label = rule
    if target == 'FLAG':
        return "- [ ] **{0}** ({1}) -- {2}\n  - WARNING NEEDS REVIEW: {3}\n".format(ref, cat, text, label)
    if target == 'DUP':
        return "- [ ] **{0}** ({1}) -- {2}\n  - WARNING DUPLICATE: {3}\n".format(ref, cat, text, label)
    if target == 'DROP':
        return "- [x] **{0}** ({1}) -- {2}\n  - DROPPED (confirmed duplicate): {3}\n".format(ref, cat, text, label)
    scope_str = 'none (common)' if scope is None else "{0}:{1}".format(scope[0], ','.join(scope[1]))
    tag = ' [internal-only -- no vendor-facing phrasing in source]' if item.get('internal_only') else ''
    return "- [ ] **{0}** ({1}) -- {2}{3}\n  - -> proposed: **{4}** / scope: {5} / section: \"{6}\"\n".format(
        ref, cat, text, tag, target, scope_str, label)

lines = []
lines.append("# Stage 2 -- Question Migration Tracking\n")
lines.append("Source: `docs/adas_vendor_technical_evaluation_internal.xlsx` (+ supplier variant) and `docs/adas_partner_perception_and_function_evaluation.xlsx`. 217 total source items (139 + 78).\n")
lines.append("Each item below has a proposed target (General vs Product, and scope if Product). Tick the checkbox once we've confirmed placement together. All 8 open decisions below are resolved; 3 items are marked DROPPED as confirmed duplicates and pre-checked.\n")

lines.append("\n## Open decisions -- RESOLVED (see plan.md Stage 2 section for rationale)\n")
lines.append("1. **DMS modeling** -> added as a Function (`DMS`), parallel to AEB/ACC/etc. DMS sections are now function:DMS scoped.\n")
lines.append("2. **Compute/SoC/TOPS duplicate** -> merged into one Product-common \"Architecture & Platform\" section. PERC-S3#1 dropped as a literal duplicate of TECH#17; the complementary deeper PERC items (TIDL, quantization, min-TOPS, camera min-spec) kept.\n")
lines.append("3. **AUTOSAR duplicate** -> kept TECH#22 (broader), dropped PERC-S3#10 (narrower subset).\n")
lines.append("4. **SIL/HIL/simulator duplicate** -> kept TECH#57-59 (more complete breakdown), dropped PERC-S3#13.\n")
lines.append("5. **Camera-only vs generic split** -> applied per-item: TECH#49/#52/#53 (IP rating, lens contamination, calibration drift) -> Camera Subsystem; TECH#48/#50/#51 (operating temp, EMC/EMI, vibration/shock) + all of Components -> Product-common \"HW Robustness & Components\". PERC-S3#11/#12 (ISP dependency, calibration tooling) also moved to Camera Subsystem despite sitting in generic \"Integration\" category.\n")
lines.append("6. **Function-scoped safety items** (\"Target ASIL per function\", \"Safe state definition per function\") -> kept in General as free text; no new scoping infrastructure built for just 2 items.\n")
lines.append("7. **Camera-scoped lifecycle item** -> TECH#109 (\"Spare parts strategy (camera modules)\") moved to Camera Subsystem.\n")
lines.append("8. **Limitations / India Readiness** -> Product-common (wording is explicitly about \"your current stack\", not company-wide).\n")

lines.append("\n## Technical Evaluation (139 items)\n")
by_section = {}
order = []
for item in tech:
    if item['section'] not in by_section:
        by_section[item['section']] = []
        order.append(item['section'])
    by_section[item['section']].append(item)
for sec in order:
    lines.append("\n### {0}\n".format(sec))
    for item in by_section[sec]:
        lines.append(render_item(item, TECH_RULES))

lines.append("\n## Perception & Function Evaluation (78 items)\n")
by_section = {}
order = []
for item in perc:
    if item['section'] not in by_section:
        by_section[item['section']] = []
        order.append(item['section'])
    by_section[item['section']].append(item)
for sec in order:
    lines.append("\n### {0}\n".format(sec))
    for item in by_section[sec]:
        lines.append(render_item(item, PERC_RULES))

with open('docs/stage2_question_migration.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

flags = sum(1 for item in tech if TECH_RULES.get(item['category'], (None,))[0] in ('FLAG', 'DUP')) + \
        sum(1 for item in perc if PERC_RULES.get(item['category'], (None,))[0] in ('FLAG', 'DUP'))
print("Total items:", len(tech) + len(perc), "| Flagged for review/dup:", flags)
