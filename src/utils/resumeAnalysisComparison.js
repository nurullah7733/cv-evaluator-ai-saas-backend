// Comparison helper function
const generateComparison = (previous, current) => {
  if (!previous) return null;

  return {
    scoreChanges: {
      overall: {
        previous: previous.scores.overall,
        current: current.scores.overall,
        change: current.scores.overall - previous.scores.overall,
        trend:
          current.scores.overall > previous.scores.overall
            ? "up"
            : current.scores.overall < previous.scores.overall
            ? "down"
            : "same",
      },
    },
    breakdownChanges: {
      structure: {
        previous: previous.breakdown.structure,
        current: current.breakdown.structure,
        change: current.breakdown.structure - previous.breakdown.structure,
      },
      language: {
        previous: previous.breakdown.language,
        current: current.breakdown.language,
        change: current.breakdown.language - previous.breakdown.language,
      },
      keywords: {
        previous: previous.breakdown.keywords,
        current: current.breakdown.keywords,
        change: current.breakdown.keywords - previous.breakdown.keywords,
      },
      experience: {
        previous: previous.breakdown.experience,
        current: current.breakdown.experience,
        change: current.breakdown.experience - previous.breakdown.experience,
      },
    },
    summary: {
      overallTrend:
        current.scores.overall > previous.scores.overall
          ? "improved"
          : "declined",
      keyImprovements:
        current.scores.overall > previous.scores.overall
          ? [
              `Overall score improved by ${
                current.scores.overall - previous.scores.overall
              } points`,
            ]
          : [],
      areasNeedingWork:
        current.scores.overall <= previous.scores.overall
          ? ["Score needs improvement", "Review recent changes"]
          : [],
    },
  };
};
// Enhanced detailed comparison function
const generateDetailedComparison = (previous, current) => {
  if (!previous) return null;

  // Helper functions
  const getAddedSkills = (prev, curr) => {
    const prevSkills = [
      ...(prev.resumeSections.skills.programming || []),
      ...(prev.resumeSections.skills.frameworks || []),
      ...(prev.resumeSections.skills.technical || []),
    ];
    const currSkills = [
      ...(curr.resumeSections.skills.programming || []),
      ...(curr.resumeSections.skills.frameworks || []),
      ...(curr.resumeSections.skills.technical || []),
    ];
    return currSkills.filter((skill) => !prevSkills.includes(skill));
  };

  const getRemovedSkills = (prev, curr) => {
    const prevSkills = [
      ...(prev.resumeSections.skills.programming || []),
      ...(prev.resumeSections.skills.frameworks || []),
    ];
    const currSkills = [
      ...(curr.resumeSections.skills.programming || []),
      ...(curr.resumeSections.skills.frameworks || []),
    ];
    return prevSkills.filter((skill) => !currSkills.includes(skill));
  };

  return {
    scoreChanges: {
      overall: {
        previous: previous.scores.overall,
        current: current.scores.overall,
        change: current.scores.overall - previous.scores.overall,
        trend: current.scores.overall > previous.scores.overall ? "up" : "down",
      },
    },

    breakdownChanges: {
      structure: {
        previous: previous.breakdown.structure,
        current: current.breakdown.structure,
        change: current.breakdown.structure - previous.breakdown.structure,
      },
      language: {
        previous: previous.breakdown.language,
        current: current.breakdown.language,
        change: current.breakdown.language - previous.breakdown.language,
      },
      keywords: {
        previous: previous.breakdown.keywords,
        current: current.breakdown.keywords,
        change: current.breakdown.keywords - previous.breakdown.keywords,
      },
      experience: {
        previous: previous.breakdown.experience,
        current: current.breakdown.experience,
        change: current.breakdown.experience - previous.breakdown.experience,
      },
    },

    skillsChanges: {
      added: getAddedSkills(previous, current),
      removed: getRemovedSkills(previous, current),
    },

    suggestionsChanges: {
      previousCount: previous.suggestions?.length || 0,
      currentCount: current.suggestions?.length || 0,
      change:
        (current.suggestions?.length || 0) -
        (previous.suggestions?.length || 0),
    },

    timespan: {
      days: Math.floor(
        (new Date(current.createdAt) - new Date(previous.createdAt)) /
          (1000 * 60 * 60 * 24)
      ),
      from: previous.createdAt,
      to: current.createdAt,
    },

    summary: {
      overallTrend:
        current.scores.overall > previous.scores.overall
          ? "improved"
          : "declined",
      totalChanges: Math.abs(current.scores.overall - previous.scores.overall),
      keyImprovements:
        current.scores.overall > previous.scores.overall
          ? [
              `Overall score improved by ${
                current.scores.overall - previous.scores.overall
              } points`,
            ]
          : [],
      areasNeedingWork:
        current.scores.overall <= previous.scores.overall
          ? ["Score needs improvement", "Review recent changes"]
          : [],
    },
  };
};

module.exports = { generateComparison, generateDetailedComparison };
