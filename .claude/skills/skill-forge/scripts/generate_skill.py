#!/usr/bin/env python3
"""
Intelligent Skill Generator

This script assists in generating complete skill structures by:
1. Analyzing requirements and examples
2. Determining optimal architecture
3. Creating directory structure with appropriate resources
4. Generating starter templates for SKILL.md and resources
"""

import os
import sys
import argparse
import json
from pathlib import Path
from datetime import datetime


class SkillGenerator:
    """Intelligent skill structure generator"""
    
    def __init__(self, skill_name, output_dir, skill_type=None):
        self.skill_name = skill_name
        self.output_dir = Path(output_dir)
        self.skill_dir = self.output_dir / skill_name
        self.skill_type = skill_type
        
    def create_structure(self):
        """Create complete skill directory structure"""
        print(f"Creating skill structure for: {self.skill_name}")
        
        # Create main directories
        self.skill_dir.mkdir(parents=True, exist_ok=True)
        (self.skill_dir / "scripts").mkdir(exist_ok=True)
        (self.skill_dir / "references").mkdir(exist_ok=True)
        (self.skill_dir / "assets").mkdir(exist_ok=True)
        
        print(f"✓ Created directory structure at {self.skill_dir}")
        
    def generate_skill_md(self, description=None, capabilities=None, triggers=None):
        """Generate SKILL.md with intelligent template"""
        
        # Default description if none provided
        if not description:
            description = f"{self.skill_name} skill. TODO: Add complete description including what it does and when to use it."
        
        # Generate frontmatter
        frontmatter = f"""---
name: {self.skill_name}
description: {description}
---

"""
        
        # Generate body based on skill type
        body = self._generate_body_template()
        
        skill_md_path = self.skill_dir / "SKILL.md"
        with open(skill_md_path, 'w') as f:
            f.write(frontmatter + body)
        
        print(f"✓ Generated SKILL.md")
        
    def _generate_body_template(self):
        """Generate appropriate body template based on skill type"""
        
        templates = {
            "api": """# {name} API Integration

## Quick Start

Basic workflow:
1. Authenticate
2. Make requests
3. Process responses

## Authentication

TODO: Add authentication details or reference to scripts/auth.py

## Common Operations

### Operation 1
TODO: Describe key operation
Usage: `scripts/operation1.py`

### Operation 2
TODO: Describe key operation
See: `references/operation2.md`

## Examples

See `references/examples.md` for usage examples.
""",
            "document": """# {name} Document Processing

## Workflow

1. Load document (scripts/load.py)
2. Extract data (scripts/extract.py)
3. Transform format
4. Validate output

## Loading Documents

TODO: Document loading process
Script: `scripts/load.py`

## Extraction

TODO: Describe extraction process
Details: `references/extraction.md`

## Output

TODO: Describe output format
Template: `assets/template.md`

## Examples

See `references/examples.md` for complete examples.
""",
            "analysis": """# {name} Data Analysis

## Analysis Workflow

1. Load and validate data
2. Perform analysis
3. Generate insights
4. Create report

## Data Loading

TODO: Describe data sources
Reference: `references/data-sources.md`

## Analysis Methods

TODO: Document analysis approaches
Details: `references/methods.md`

## Report Format

TODO: Define output structure
Template: `assets/report-template.md`

## Examples

See `references/examples.md` for sample analyses.
""",
            "workflow": """# {name} Workflow

## Workflow Overview

Complete process:
1. Step 1: TODO
2. Step 2: TODO
3. Step 3: TODO
4. Step 4: TODO

## Step-by-Step Execution

### Step 1: [Name]
TODO: Describe step
Script: `scripts/step1.py`

### Step 2: [Name]
TODO: Describe step
Script: `scripts/step2.py`

## Validation

TODO: Define success criteria

## Examples

See `references/examples.md` for walkthrough.
""",
            "generic": """# {name}

## Overview

TODO: Brief description of what this skill does.

## Workflow

TODO: Main process or steps:
1. Step 1
2. Step 2
3. Step 3

## Usage

TODO: How to use this skill
- Key operation 1
- Key operation 2

## Resources

TODO: Reference bundled resources
- Scripts: `scripts/`
- References: `references/`
- Assets: `assets/`

## Examples

TODO: Add concrete examples of usage.
"""
        }
        
        template_key = self.skill_type if self.skill_type in templates else "generic"
        template = templates[template_key]
        
        return template.format(name=self.skill_name.replace('-', ' ').title())
    
    def generate_example_script(self, script_name="example.py"):
        """Generate example script with proper structure"""
        
        script_content = f'''#!/usr/bin/env python3
"""
{script_name.replace('.py', '').replace('_', ' ').title()}

TODO: Describe what this script does.
"""

import argparse
import sys
from pathlib import Path


def main(args):
    """Main execution function"""
    # TODO: Implement script logic
    print(f"Processing: {{args.input}}")
    
    # Example processing
    # result = process_data(args.input)
    # save_output(result, args.output)
    
    print("✓ Complete")
    return 0


def setup_args():
    """Setup command-line arguments"""
    parser = argparse.ArgumentParser(
        description="TODO: Script description"
    )
    parser.add_argument(
        "input",
        help="Input file path"
    )
    parser.add_argument(
        "-o", "--output",
        default="output.json",
        help="Output file path (default: output.json)"
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = setup_args()
    sys.exit(main(args))
'''
        
        script_path = self.skill_dir / "scripts" / script_name
        with open(script_path, 'w') as f:
            f.write(script_content)
        
        # Make executable
        script_path.chmod(0o755)
        
        print(f"✓ Generated example script: scripts/{script_name}")
    
    def generate_example_reference(self, ref_name="examples.md"):
        """Generate example reference file"""
        
        ref_content = f"""# {ref_name.replace('.md', '').replace('-', ' ').title()}

TODO: Add detailed reference information here.

## Overview

[Provide context and overview]

## Details

### Section 1
[Detailed information]

### Section 2
[Detailed information]

## Examples

**Example 1:**
Input: [Example input]
Output: [Example output]

**Example 2:**
Input: [Example input]
Output: [Example output]

## Notes

[Additional notes or considerations]
"""
        
        ref_path = self.skill_dir / "references" / ref_name
        with open(ref_path, 'w') as f:
            f.write(ref_content)
        
        print(f"✓ Generated example reference: references/{ref_name}")
    
    def generate_example_asset(self, asset_name="template.md"):
        """Generate example asset file"""
        
        asset_content = """# Template

This is a template file that will be copied or modified in the output.

## Section 1

[Template content]

## Section 2

[Template content]
"""
        
        asset_path = self.skill_dir / "assets" / asset_name
        with open(asset_path, 'w') as f:
            f.write(asset_content)
        
        print(f"✓ Generated example asset: assets/{asset_name}")
    
    def generate_metadata(self, requirements=None):
        """Generate metadata file for tracking skill info"""
        
        metadata = {
            "name": self.skill_name,
            "type": self.skill_type,
            "created": datetime.now().isoformat(),
            "version": "1.0.0",
            "requirements": requirements or {},
            "status": "draft"
        }
        
        metadata_path = self.skill_dir / ".metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"✓ Generated metadata file")
    
    def generate_complete_skill(self, config=None):
        """Generate complete skill with all resources"""
        
        config = config or {}
        
        # Create structure
        self.create_structure()
        
        # Generate SKILL.md
        self.generate_skill_md(
            description=config.get('description'),
            capabilities=config.get('capabilities'),
            triggers=config.get('triggers')
        )
        
        # Generate example resources
        if config.get('include_script', True):
            self.generate_example_script()
        
        if config.get('include_reference', True):
            self.generate_example_reference()
        
        if config.get('include_asset', True):
            self.generate_example_asset()
        
        # Generate metadata
        self.generate_metadata(config.get('requirements'))
        
        print(f"\n✓ Skill structure complete: {self.skill_dir}")
        print(f"\nNext steps:")
        print(f"1. Review and customize SKILL.md")
        print(f"2. Implement scripts in scripts/")
        print(f"3. Add detailed references in references/")
        print(f"4. Create templates in assets/")
        print(f"5. Test the skill")
        print(f"6. Validate and package")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Generate intelligent skill structure"
    )
    parser.add_argument(
        "skill_name",
        help="Name of the skill (e.g., 'api-client', 'doc-processor')"
    )
    parser.add_argument(
        "-o", "--output",
        default=".",
        help="Output directory (default: current directory)"
    )
    parser.add_argument(
        "-t", "--type",
        choices=["api", "document", "analysis", "workflow", "generic"],
        default="generic",
        help="Skill type for template selection"
    )
    parser.add_argument(
        "-d", "--description",
        help="Skill description for frontmatter"
    )
    parser.add_argument(
        "--no-script",
        action="store_true",
        help="Don't generate example script"
    )
    parser.add_argument(
        "--no-reference",
        action="store_true",
        help="Don't generate example reference"
    )
    parser.add_argument(
        "--no-asset",
        action="store_true",
        help="Don't generate example asset"
    )
    
    args = parser.parse_args()
    
    # Create generator
    generator = SkillGenerator(
        skill_name=args.skill_name,
        output_dir=args.output,
        skill_type=args.type
    )
    
    # Configure generation
    config = {
        'description': args.description,
        'include_script': not args.no_script,
        'include_reference': not args.no_reference,
        'include_asset': not args.no_asset
    }
    
    # Generate complete skill
    generator.generate_complete_skill(config)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
