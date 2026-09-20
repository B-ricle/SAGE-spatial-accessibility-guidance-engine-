
# SAGE

**Spatial Accessibility Guidance Engine**

SAGE is a wearable spatial-awareness system designed to help visually impaired students navigate dynamic school environments safely and independently.

## Objective

Build a wearable accessibility device that uses real-time 3D mapping, computer vision, and object detection to understand a student's surroundings, predict potential collisions, and provide haptic or audio guidance.

SAGE also builds a persistent spatial understanding of frequently visited environments, allowing it to recognize familiar spaces while adapting to temporary changes such as moved chairs, backpacks, people, or other obstacles.

## Why SAGE?

For visually impaired students, navigating a school is not simply a matter of memorizing where walls and doors are. Classrooms, hallways, laboratories, and common areas constantly change as people move, furniture is rearranged, and temporary obstacles appear.

The scale of the problem is significant:

* **Nearly 3% of U.S. children under 18 have blindness or vision impairment**, defined by the CDC as difficulty seeing even while wearing glasses or contact lenses.
* CDC's newer 2024 modeled estimates indicate that **more than 3 million U.S. children have some form of presenting visual acuity loss**.
* Vision disability is considered **one of the most prevalent disabling conditions among children** in the United States.
* Across all ages, approximately **7.15 million Americans have visual acuity loss that cannot be corrected with glasses or contact lenses alone**, including more than **700,000 people categorized as blind**.

These numbers represent more than a vision problem. They represent an **accessibility and independence problem**.

SAGE is designed to provide another layer of environmental awareness rather than replace existing mobility tools. By combining a stored understanding of familiar environments with real-time sensor information, SAGE can identify what has changed, determine whether an obstacle actually intersects the student's path, and communicate that risk before a collision occurs.

## How It Works

**Sense → Map → Understand → Predict → Assist**

SAGE combines:

* **RGB-D camera + IMU** for real-time environmental sensing
* **SLAM** for localization and persistent 3D mapping
* **Computer vision** for identifying surrounding objects
* **Semantic mapping** for connecting objects to their locations in 3D space
* **Collision prediction** for determining which objects pose an immediate risk
* **Haptic/audio feedback** for accessible warnings and directional guidance
* **Supabase** for application data and persistent environment information
* **Databricks** for analytics, model evaluation, and future learning from navigation data

## Vision

Our goal is not simply to tell a student that a chair exists.

SAGE aims to understand **where the chair is, whether the student is moving toward it, whether it poses a collision risk, and how the student can safely respond**.

As SAGE encounters environments repeatedly, it can build persistent spatial knowledge while continuing to use live perception to account for a world that never stays perfectly still.

## Sources

* CDC, *Fast Facts: Vision Loss*
  https://www.cdc.gov/vision-health/data-research/vision-loss-facts/

* CDC Vision and Eye Health Surveillance System, *Modeled Estimates: Vision Loss and Blindness*
  https://www.cdc.gov/vision-health-data/prevalence-estimates/vision-loss-prevalence.html

* American Printing House for the Blind, *Federal Quota Census Data*
  https://www.aph.org/federalquota/
  
# SAGE-spatial-accessibility-guidance-engine-
