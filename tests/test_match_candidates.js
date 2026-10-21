const assert = require("node:assert/strict");

function matchCandidates(candidates, requiredSkills) {
  const required = new Set(
    requiredSkills.map(skill => skill.trim().toLowerCase())
  );

  if (required.size === 0) return [];

  const matches = [];

  for (const candidate of candidates) {
    const matchedSkills = candidate.skills.filter(skill =>
      required.has(skill.trim().toLowerCase())
    );

    if (matchedSkills.length > 0) {
      matches.push({
        name: candidate.name,
        matchedSkills,
        score: matchedSkills.length / required.size,
      });
    }
  }

  return matches.sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name)
  );
}

const candidates = [
  { name: "Asha", skills: ["Python", "SQL"] },
  { name: "Bala", skills: ["Python"] },
  { name: "Chin", skills: ["Java"] },
];

const results = matchCandidates(candidates, ["python", "SQL"]);

assert.equal(results.length, 2);
assert.equal(results[0].name, "Asha");
assert.equal(results[0].score, 1);
assert.equal(results[1].name, "Bala");
assert.equal(matchCandidates(candidates, []).length, 0);
assert.deepEqual(matchCandidates([], ["Python"]), []);

console.log("JavaScript ranking tests passed.");
