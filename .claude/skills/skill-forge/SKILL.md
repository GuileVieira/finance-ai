---
name: skill-forge
description: Advanced meta-skill for generating complete, production-ready skills for any domain. Use when the user wants to create a new skill, needs help designing a skill, wants to generate specialized skills for specific workflows, or requests "make me a skill for X". Automatically analyzes requirements, designs optimal skill architecture, generates all resources (scripts/references/assets), validates output, and packages distributable .skill files. Handles technical skills (API integrations, file processing), domain expertise skills (finance, legal, medical), workflow skills (multi-step processes), and creative skills (writing, design, content generation).
---

# Skill Forge

**Generate complete, production-ready skills for any domain with optimal architecture and all required resources.**

## Core Capability

Skill Forge transforms skill requests into complete, validated, distributable .skill packages by:

1. **Intelligent requirement analysis** - Extract skill purpose, triggers, workflows, and resource needs
2. **Optimal architecture design** - Determine appropriate freedom levels, resource structure, and patterns
3. **Complete resource generation** - Create scripts, references, assets, and comprehensive SKILL.md
4. **Automatic validation** - Ensure all requirements met before packaging
5. **Distributable packaging** - Generate ready-to-use .skill files

## When to Use Skill Forge

Trigger when users request:
- "Make me a skill for [domain/task]"
- "Create a skill that does [functionality]"
- "I need a skill to help with [workflow]"
- "Generate a [topic] skill"
- Any request to create, design, or improve a skill

## Skill Generation Workflow

### Phase 1: Understand Requirements

**Goal:** Extract clear examples of how the skill will be used.

Ask targeted questions to understand:
- **Functionality**: What should this skill do? What are the main tasks?
- **Triggers**: What would a user say to invoke this skill?
- **Context**: Who will use it? What's their expertise level?
- **Examples**: "Can you give 3-5 concrete examples of queries this skill should handle?"
- **Constraints**: Any specific requirements, formats, or limitations?

**Avoid overwhelming users** - Ask 2-3 questions max per message, prioritize most important.

**Conclude when:** You have 3-5 concrete usage examples and understand the scope.

### Phase 2: Analyze Architecture

**Goal:** Design optimal skill structure and identify all required resources.

For each concrete example, determine:

1. **Workflow complexity:**
   - Simple (single operation) → Concise instructions
   - Medium (multi-step) → Sequential workflow with checkpoints
   - Complex (branching logic) → Conditional workflow with decision trees

2. **Required resources:**
   - **Scripts** (`scripts/`): Repeated code, deterministic operations, fragile processes
   - **References** (`references/`): Schemas, API docs, domain knowledge, examples
   - **Assets** (`assets/`): Templates, boilerplate, images, fonts, sample files

3. **Freedom level:**
   - **High freedom**: Multiple valid approaches, context-dependent decisions
   - **Medium freedom**: Preferred patterns with some flexibility
   - **Low freedom**: Fragile operations requiring specific sequences

4. **Progressive disclosure needs:**
   - Core workflow in SKILL.md (<500 lines)
   - Detailed references in separate files
   - Optional resources loaded as needed

**Output:** Complete architectural plan listing all resources to generate.

### Phase 3: Generate Skill Resources

**Order of generation:**
1. Create bundled resources first (scripts/references/assets)
2. Write SKILL.md last (after understanding all resources)

#### Generate Scripts (`scripts/`)

Create Python/Bash scripts for:
- Repeated operations (same code written multiple times)
- Deterministic tasks requiring exact execution
- Complex algorithms or data processing
- Fragile operations prone to errors

**Script requirements:**
- Executable and tested
- Clear docstrings and comments
- Proper error handling
- Command-line friendly (argparse for Python)

**Example:** For PDF rotation skill, create `scripts/rotate_pdf.py`

#### Generate References (`references/`)

Create reference files for:
- Database schemas and relationships
- API documentation and endpoints
- Domain-specific knowledge
- Detailed examples and patterns
- Company policies or guidelines

**Reference file principles:**
- Structured and scannable (headers, lists, tables)
- Include search keywords for easy grep
- Avoid duplication with SKILL.md
- Load only when needed

**Example:** For BigQuery skill, create `references/schema.md` with table schemas

#### Generate Assets (`assets/`)

Create asset files for:
- Templates to copy or modify
- Boilerplate code structures
- Brand assets (logos, fonts, colors)
- Sample documents or files
- Static resources used in output

**Asset principles:**
- Not loaded into context
- Used in final output
- Ready to copy/modify
- Organized by type

**Example:** For webapp skill, create `assets/react-template/` with boilerplate React project

#### Generate SKILL.md

Create comprehensive SKILL.md with:

**Frontmatter (YAML):**
```yaml
---
name: skill-name
description: Complete description including WHAT the skill does and WHEN to use it. Include all triggers, contexts, and use cases here since body loads only after triggering. Examples: "Use when user requests X", "Triggers include Y", "Handles Z tasks".
---
```

**Body (Markdown):**

1. **Overview** - Brief capability summary
2. **Core workflow** - Main process or steps
3. **Resource usage** - How to use bundled scripts/references/assets
4. **Examples** - Concrete input/output demonstrations
5. **Advanced patterns** - Optional techniques or variations
6. **References to external files** - When to load each reference

**Writing principles:**
- Concise (challenge every paragraph's token cost)
- Imperative/infinitive form ("Use X" not "You should use X")
- Examples over explanations
- Keep under 500 lines (split to references if longer)
- Assume Claude is smart (don't over-explain)

**Progressive disclosure:**
- Essential workflow in SKILL.md
- Detailed guidance in references
- Variants in separate files

### Phase 4: Validate & Package

1. **Run validation** using `scripts/quick_validate.py`:
   - YAML frontmatter format
   - Required name and description fields
   - Skill naming conventions
   - Directory structure
   - Description completeness
   - Resource references

2. **Package skill** using `scripts/package_skill.py`:
   - Creates `skill-name.skill` file (zip with .skill extension)
   - Includes all files and directory structure
   - Ready for distribution

3. **Provide to user:**
   - Link to download .skill file
   - Brief usage instructions
   - Trigger phrase examples

## Best Practices by Skill Type

### Technical Integration Skills

**Examples:** API clients, file format processors, database tools

**Key resources:**
- `scripts/` for API wrappers and processing logic
- `references/` for API documentation, schemas, endpoints
- Minimal SKILL.md focused on workflow

**Pattern:**
```markdown
# API Integration Workflow
1. Authenticate (use scripts/auth.py)
2. Fetch data (use scripts/fetch.py)
3. Process response (see references/schema.md)
4. Transform output
```

### Domain Expertise Skills

**Examples:** Finance, legal, medical, industry-specific

**Key resources:**
- `references/` for domain knowledge, terminology, frameworks
- `assets/` for templates and examples
- Detailed SKILL.md with decision trees

**Pattern:**
```markdown
# Domain Analysis Workflow
1. Identify document type (see references/types.md)
2. Apply framework (see references/framework.md)
3. Generate output using template (assets/template.docx)
```

### Multi-Step Workflow Skills

**Examples:** Report generation, data pipelines, content creation

**Key resources:**
- `scripts/` for each major step
- `references/` for examples and quality standards
- Clear sequential workflow in SKILL.md

**Pattern:**
```markdown
# Workflow Steps
1. Gather inputs (run scripts/gather.py)
2. Process data (run scripts/process.py)
3. Generate output (run scripts/generate.py)
4. Validate result (run scripts/validate.py)
```

### Creative Content Skills

**Examples:** Writing, design, content generation

**Key resources:**
- `references/` for style guides, examples, voice/tone
- `assets/` for templates, brand assets
- Template pattern in SKILL.md

**Pattern:**
```markdown
# Content Creation
Follow brand voice in references/voice.md
Use templates from assets/templates/
Examples in references/examples.md
```

## Skill Generation Checklist

Before finalizing any skill, verify:

- [ ] Frontmatter has `name` and complete `description` with triggers
- [ ] Description includes WHEN to use the skill (all triggers)
- [ ] SKILL.md under 500 lines (or split appropriately)
- [ ] All scripts are tested and executable
- [ ] References are well-structured and scannable
- [ ] Assets are ready to use in output
- [ ] No README.md or extraneous documentation
- [ ] Progressive disclosure used appropriately
- [ ] Examples demonstrate key functionality
- [ ] Validation passes (`quick_validate.py`)
- [ ] Package created successfully (`package_skill.py`)

## Advanced Patterns

### Multi-Framework Skills

When skill supports multiple frameworks/variations:

**SKILL.md:**
```markdown
# Core Workflow
1. Choose framework (see references/frameworks.md)
2. Follow framework-specific guide

## Framework Selection
- React → See references/react.md
- Vue → See references/vue.md
- Angular → See references/angular.md
```

Each framework guide in separate reference file.

### Conditional Workflows

For branching logic:

```markdown
# Workflow
1. Determine task type:
   **Creating new?** → Creation workflow (below)
   **Modifying existing?** → Modification workflow (below)
   **Analyzing?** → Analysis workflow (below)

## Creation Workflow
[Steps for creation]

## Modification Workflow
[Steps for modification]

## Analysis Workflow
[Steps for analysis]
```

### Template-Based Skills

For consistent output:

```markdown
# Output Format

ALWAYS use this structure:

# [Title]
## Executive Summary
[One paragraph]

## Key Findings
- Finding 1 with data
- Finding 2 with data

## Recommendations
1. Actionable recommendation
2. Actionable recommendation
```

Use "ALWAYS" for strict requirements, "suggested format" for flexible guidance.

## Common Anti-Patterns to Avoid

**❌ Don't:**
- Create README.md, CHANGELOG.md, or auxiliary docs
- Duplicate content between SKILL.md and references
- Over-explain basic concepts Claude already knows
- Use first-person language ("I will" or "You should")
- Create single-purpose skills that could be general-purpose
- Include setup instructions or testing procedures
- Make SKILL.md longer than 500 lines without splitting

**✅ Do:**
- Keep SKILL.md focused on essential workflow
- Use imperative form ("Use", "Run", "Follow")
- Trust Claude's intelligence
- Split detailed content to references
- Design for reusability across contexts
- Focus on procedural knowledge Claude doesn't have
- Test all scripts before finalizing

## Iteration & Improvement

After generating a skill:

1. **Test with real queries** - Try actual use cases
2. **Identify friction points** - Where does Claude struggle?
3. **Analyze root cause** - Missing resource? Unclear instructions? Wrong pattern?
4. **Update resources** - Modify scripts, references, or SKILL.md
5. **Re-validate and package** - Ensure improvements work
6. **Document learnings** - Note patterns for future skills

## Using Skill Forge Effectively

**For users:**
- Provide 3-5 concrete usage examples
- Specify expertise level of end users
- Share any existing templates, docs, or code
- Indicate must-haves vs nice-to-haves

**For Skill Forge:**
- Ask targeted questions (2-3 max per message)
- Generate complete resources, not just outlines
- Test scripts before including them
- Validate before packaging
- Provide clear usage instructions with .skill file

## Skill Generation Speed Patterns

**Quick skills (10 min):**
- Simple domain knowledge
- No scripts needed
- Light references
- Template-based output

**Medium skills (30 min):**
- 2-4 scripts
- Multiple references
- Asset templates
- Multi-step workflows

**Complex skills (60+ min):**
- 5+ scripts
- Extensive references
- Asset libraries
- Conditional workflows
- Framework variations

Set expectations based on complexity.

## Script Tools

Use the initialization and packaging scripts from skill-creator:

**Initialize new skill:**
```bash
/mnt/skills/examples/skill-creator/scripts/init_skill.py <skill-name> --path <output-dir>
```

**Validate skill:**
```bash
/mnt/skills/examples/skill-creator/scripts/quick_validate.py <skill-directory>
```

**Package skill:**
```bash
/mnt/skills/examples/skill-creator/scripts/package_skill.py <skill-directory> [output-dir]
```

## Example: Complete Skill Generation

**User request:** "Make me a skill for analyzing financial reports"

**Phase 1: Requirements**
Q: "What types of financial reports? (10-K, earnings, balance sheets, all?)"
Q: "What analysis do you need? (ratios, trends, comparisons, recommendations?)"
Q: "Any specific output format requirements?"

**Phase 2: Architecture**
- Workflow: Sequential (load → analyze → generate report)
- Scripts: None needed (analysis is context-dependent)
- References: `references/financial-ratios.md`, `references/analysis-framework.md`, `references/report-examples.md`
- Assets: `assets/report-template.md`
- Freedom: High (analysis varies by report type)

**Phase 3: Generate**

1. Create `references/financial-ratios.md` with ratio definitions and formulas
2. Create `references/analysis-framework.md` with step-by-step analysis approach
3. Create `references/report-examples.md` with sample analyses
4. Create `assets/report-template.md` with output structure
5. Write `SKILL.md` with workflow and resource references

**Phase 4: Validate & Package**
1. Run `quick_validate.py` → Pass
2. Run `package_skill.py` → Generate `financial-analysis.skill`
3. Provide download link and usage examples

## Summary

Skill Forge generates complete, production-ready skills by:
1. Understanding requirements through targeted questions
2. Designing optimal architecture based on patterns
3. Generating all resources (scripts, references, assets)
4. Creating comprehensive SKILL.md
5. Validating and packaging for distribution

Every generated skill follows best practices, leverages progressive disclosure, and focuses on the essential procedural knowledge that makes Claude effective at specialized tasks.
