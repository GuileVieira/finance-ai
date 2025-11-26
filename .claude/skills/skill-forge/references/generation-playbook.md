# Skill Generation Playbook

Complete guide for generating world-class skills using Skill Forge.

## The Skill Forge Process

### Phase 1: Discovery (5-10 min)

**Goal:** Understand what skill to build and how it will be used.

**Questions to ask:**
1. "What should this skill do?" (Core functionality)
2. "Who will use it and what's their expertise level?" (User context)
3. "Can you give me 3-5 examples of how this skill would be used?" (Concrete usage)
4. "What would someone say to trigger this skill?" (Trigger phrases)
5. "Are there any specific requirements or constraints?" (Special needs)

**Red flags:**
- User can't provide concrete examples → Dig deeper
- Scope is too broad → Help narrow it down
- Requirements conflict → Clarify priorities

**Output:** 3-5 concrete usage examples + clear understanding of purpose

### Phase 2: Architecture (10-15 min)

**Goal:** Design optimal skill structure and identify all resources needed.

**Analysis steps:**

1. **Classify skill type:**
   - API Integration → Needs auth, endpoints, schemas
   - Document Processing → Needs loaders, extractors, templates
   - Data Analysis → Needs methods, frameworks, visualizations
   - Workflow → Needs step scripts, checkpoints, validation
   - Domain Expertise → Needs references, frameworks, examples
   - Content Creation → Needs templates, style guides, examples

2. **Determine workflow complexity:**
   - Simple (1-2 steps) → Concise instructions
   - Medium (3-5 steps) → Sequential workflow
   - Complex (6+ steps or branching) → Conditional workflow with decision trees

3. **Select freedom level:**
   - High: Creative tasks, analytical work, context-dependent decisions
   - Medium: Preferred patterns with flexibility
   - Low: Fragile operations, specific sequences, deterministic outputs

4. **Identify required resources:**

   **Scripts needed when:**
   - Same code would be written 2+ times
   - Operations are fragile or error-prone
   - Complexity benefits from dedicated implementation
   - Performance or determinism is critical

   **References needed for:**
   - Schemas, API docs, database structures
   - Domain knowledge and frameworks
   - Detailed examples and patterns
   - Quality standards and guidelines
   - Information too detailed for SKILL.md

   **Assets needed for:**
   - Templates to copy/modify
   - Boilerplate code structures
   - Brand assets (logos, fonts)
   - Sample files or documents

**Tools to use:**
```bash
# Analyze requirements automatically
scripts/analyze_requirements.py my-skill \
  -e "Example 1" "Example 2" "Example 3" \
  -o analysis.json
```

**Output:** Complete architectural plan with resource list

### Phase 3: Generation (20-60 min)

**Goal:** Create all skill resources and comprehensive SKILL.md.

**Order of operations:**

1. **Initialize structure:**
```bash
scripts/generate_skill.py my-skill \
  -t [api|document|analysis|workflow|generic] \
  -d "Complete description with triggers" \
  -o /path/to/output
```

2. **Create scripts (high-priority first):**
   - Write actual working code
   - Include proper error handling
   - Add docstrings and comments
   - Test thoroughly before moving on
   
3. **Create references (essential first):**
   - Structure for easy scanning
   - Include grep-friendly keywords
   - Split long content appropriately
   - Cross-reference from SKILL.md

4. **Create assets (if needed):**
   - Ready-to-use templates
   - Organized by type/purpose
   - Not loaded into context

5. **Write SKILL.md (last):**
   - Frontmatter with complete description
   - Core workflow (essential only)
   - References to bundled resources
   - Concrete examples
   - Keep under 500 lines

**Writing principles:**

**Conciseness:**
```markdown
❌ Bad: "In order to rotate a PDF file, you will need to use the rotation 
script which is located in the scripts directory. This script takes a PDF 
as input and rotates it by the angle you specify..."

✅ Good: "Rotate PDF: `scripts/rotate_pdf.py input.pdf --angle 90`"
```

**Imperative form:**
```markdown
❌ Bad: "You should validate the input before processing"
✅ Good: "Validate input before processing"
```

**Progressive disclosure:**
```markdown
✅ Good SKILL.md:
# Core Workflow
1. Authenticate
2. Fetch data
3. Process response

## Advanced
See references/advanced.md for:
- Batch operations
- Custom endpoints
- Error recovery

✅ Good references/advanced.md:
[Detailed advanced features]
```

**Templates vs. flexibility:**
```markdown
# Strict (for API responses, data formats)
ALWAYS use this exact structure:
[Template]

# Flexible (for creative work)
Here is a suggested format, adjust as needed:
[Template]
```

### Phase 4: Validation & Packaging (5-10 min)

**Goal:** Ensure quality and create distributable package.

**Validation steps:**

1. **Manual review:**
   - [ ] Description includes WHAT and WHEN
   - [ ] SKILL.md under 500 lines
   - [ ] All scripts tested and work
   - [ ] References well-structured
   - [ ] Assets ready to use
   - [ ] No README or auxiliary docs
   - [ ] Examples demonstrate key features

2. **Automated validation:**
```bash
scripts/quick_validate.py /path/to/skill
```

3. **Test with real queries:**
   - Try 3-5 usage examples
   - Note any friction points
   - Verify scripts execute correctly
   - Check references are helpful

4. **Package for distribution:**
```bash
scripts/package_skill.py /path/to/skill /output/directory
```

**Output:** Validated, tested, packaged .skill file

### Phase 5: Delivery & Iteration

**Deliver to user:**
1. Provide download link to .skill file
2. Share 2-3 example trigger phrases
3. Brief usage instructions
4. Highlight key capabilities

**Iteration process:**
1. User tests skill on real tasks
2. Collect feedback on struggles
3. Identify root causes:
   - Missing information in SKILL.md?
   - Unclear instructions?
   - Missing script or reference?
   - Wrong freedom level?
4. Update appropriate files
5. Re-validate and package
6. Deliver updated version

## Skill Type Playbooks

### API Integration Skill

**Discovery questions:**
- "Which API are we integrating with?"
- "What operations do you need? (CRUD, search, etc.)"
- "How do you authenticate?"

**Required resources:**
- `scripts/auth.py` - Authentication handling
- `scripts/api_client.py` - Request wrapper
- `references/endpoints.md` - All endpoints
- `references/schemas.md` - Request/response formats
- `references/examples.md` - Usage examples

**SKILL.md structure:**
```markdown
# API Integration

## Quick Start
1. Authenticate
2. Make requests
3. Handle responses

## Authentication
[Brief overview or reference to scripts/auth.py]

## Common Operations
[Key operations with script references]

## Examples
See references/examples.md
```

**Freedom level:** Low (APIs are fragile, use scripts)

### Document Processing Skill

**Discovery questions:**
- "What document types? (PDF, DOCX, etc.)"
- "What do you extract or modify?"
- "What's the output format?"

**Required resources:**
- `scripts/load.py` - Load documents
- `scripts/extract.py` - Extract data
- `scripts/transform.py` - Transform format
- `references/formats.md` - Supported formats
- `references/extraction-patterns.md` - Extraction rules
- `assets/template.json` - Output template

**SKILL.md structure:**
```markdown
# Document Processing

## Workflow
1. Load (scripts/load.py)
2. Extract (scripts/extract.py)
3. Transform (scripts/transform.py)
4. Validate

## Extraction Patterns
See references/extraction-patterns.md

## Output Format
Template: assets/template.json
```

**Freedom level:** Medium (structured process, some flexibility)

### Data Analysis Skill

**Discovery questions:**
- "What data sources?"
- "What insights do you need?"
- "What's the report format?"

**Required resources:**
- `references/methods.md` - Analysis methodologies
- `references/data-sources.md` - Data loading
- `references/interpretation.md` - Insight generation
- `references/examples.md` - Sample analyses
- `assets/report-template.md` - Report structure

**SKILL.md structure:**
```markdown
# Data Analysis

## Analysis Workflow
1. Load and validate data
2. Apply analysis methods
3. Generate insights
4. Create report

## Methodologies
See references/methods.md

## Report Format
Template: assets/report-template.md
```

**Freedom level:** High (analysis is context-dependent)

### Multi-Step Workflow Skill

**Discovery questions:**
- "What are the main steps?"
- "Any decision points or branches?"
- "How do you validate success?"

**Required resources:**
- `scripts/step1.py` through `scripts/stepN.py` - One per step
- `scripts/validate.py` - Output validation
- `references/walkthrough.md` - Complete example
- `references/troubleshooting.md` - Error recovery

**SKILL.md structure:**
```markdown
# Workflow Name

## Overview
[High-level steps]

## Step-by-Step
### Step 1: [Name]
Purpose: [Why]
Script: `scripts/step1.py`
Validation: [Success criteria]

[Repeat for each step]

## Checkpoints
[What to verify after each step]
```

**Freedom level:** Low (specific sequence required)

### Domain Expertise Skill

**Discovery questions:**
- "What domain? (finance, legal, medical, etc.)"
- "What tasks in this domain?"
- "Any frameworks or standards to follow?"

**Required resources:**
- `references/frameworks.md` - Domain frameworks
- `references/terminology.md` - Domain vocabulary
- `references/task-guides/` - One per task type
- `references/examples.md` - Domain examples
- `assets/templates/` - Output templates

**SKILL.md structure:**
```markdown
# Domain Expertise

## Core Capabilities
[What this skill can do]

## Task Workflows
### Task Type 1
When: [Trigger]
Process: [Steps]
Details: references/task-type-1.md

[Repeat for each task type]

## Frameworks
See references/frameworks.md
```

**Freedom level:** Medium to High (depends on standardization)

### Content Creation Skill

**Discovery questions:**
- "What content type? (blog, email, report, etc.)"
- "Target audience?"
- "Brand voice or style guidelines?"

**Required resources:**
- `references/brand-voice.md` - Voice & tone
- `references/style-guide.md` - Writing rules
- `references/examples.md` - Good examples
- `references/quality-standards.md` - Quality criteria
- `assets/template.md` - Content template

**SKILL.md structure:**
```markdown
# Content Creation

## Content Workflow
1. Understand requirements
2. Research (if needed)
3. Generate outline
4. Write content
5. Review

## Brand Guidelines
Voice: references/brand-voice.md
Style: references/style-guide.md

## Quality Standards
See references/quality-standards.md
```

**Freedom level:** Medium to High (creative with guidelines)

## Common Patterns

### Pattern: Sequential Workflow

**When to use:** Multi-step processes with clear order

**Template:**
```markdown
Complete workflow:
1. [High-level step 1]
2. [High-level step 2]
3. [High-level step 3]

## Step-by-Step

### Step 1: [Name]
[Details, script, validation]

### Step 2: [Name]
[Details, script, validation]
```

### Pattern: Conditional Workflow

**When to use:** Tasks with branching logic

**Template:**
```markdown
Determine task type:
**Creating new?** → Creation workflow
**Modifying existing?** → Modification workflow
**Analyzing?** → Analysis workflow

## Creation Workflow
[Steps for creation]

## Modification Workflow
[Steps for modification]
```

### Pattern: Template-Based

**When to use:** Consistent output format required

**Template:**
```markdown
Output structure (ALWAYS follow):

# [Title]
## Executive Summary
[One paragraph]

## Key Findings
- Finding 1
- Finding 2

## Recommendations
1. Recommendation 1
2. Recommendation 2
```

### Pattern: Example-Driven

**When to use:** Quality depends on seeing examples

**Template:**
```markdown
Follow these examples:

**Example 1:**
Input: [Input]
Output: [Output]

**Example 2:**
Input: [Input]
Output: [Output]

Match this style and level of detail.
```

## Quality Checklist

Before packaging any skill:

**Structure:**
- [ ] SKILL.md exists with proper frontmatter
- [ ] Name follows conventions (lowercase, hyphens)
- [ ] Description includes WHAT and WHEN (2-4 sentences)
- [ ] No README or auxiliary documentation
- [ ] Proper directory structure (scripts/, references/, assets/)

**Content:**
- [ ] SKILL.md under 500 lines
- [ ] Core workflow clearly explained
- [ ] Appropriate freedom level used
- [ ] Progressive disclosure applied
- [ ] Examples included
- [ ] Concise (challenges each paragraph)
- [ ] Imperative form throughout

**Resources:**
- [ ] All scripts tested and work
- [ ] Scripts have error handling
- [ ] References well-structured and scannable
- [ ] Assets ready to use
- [ ] All resources referenced from SKILL.md
- [ ] No duplication between files

**Validation:**
- [ ] quick_validate.py passes
- [ ] Tested with 3+ real examples
- [ ] No friction points identified
- [ ] Package creates successfully

## Time Estimates

**Quick skills (15-30 min):**
- Simple domain knowledge
- Template-based output
- No scripts needed
- 1-2 references

**Medium skills (30-60 min):**
- 2-4 scripts
- Multiple references
- Asset templates
- Multi-step workflows

**Complex skills (60-120 min):**
- 5+ scripts
- Extensive references
- Asset libraries
- Conditional workflows
- Framework variations

## Common Mistakes to Avoid

1. **Over-explaining basics** - Trust Claude's intelligence
2. **Monolithic SKILL.md** - Split to references
3. **Missing triggers** - Description must include WHEN
4. **Untested scripts** - Always test before including
5. **Vague instructions** - Be specific or provide examples
6. **Wrong freedom level** - Match to task fragility
7. **Duplication** - Information should live in one place
8. **Auxiliary docs** - No README, CHANGELOG, etc.

## Success Criteria

A world-class skill:
- Triggers accurately based on description
- Provides exactly the right level of guidance
- Includes all necessary resources
- Validates and packages cleanly
- Feels natural to use
- Produces high-quality outputs consistently

Use this playbook to generate skills that meet these standards every time.
