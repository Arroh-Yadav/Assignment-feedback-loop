export const BRANCHES: {
  name: string;
  code: string;
  subBranches: { name: string; code: string }[];
}[] = [
  {
    name: "Computer Science",
    code: "CS",
    subBranches: [
      { name: "CS - Artificial Intelligence", code: "CS-AI" },
      { name: "CS - Data Science", code: "CS-DS" },
      { name: "CS - Cyber Security", code: "CS-CY" },
    ],
  },
  {
    name: "Electronics & Communication",
    code: "EC",
    subBranches: [
      { name: "EC - VLSI Design", code: "EC-VL" },
      { name: "EC - Embedded Systems", code: "EC-ES" },
    ],
  },
  {
    name: "Mechanical Engineering",
    code: "ME",
    subBranches: [{ name: "ME - Thermal Engineering", code: "ME-TH" }],
  },
  {
    name: "Civil Engineering",
    code: "CE",
    subBranches: [{ name: "CE - Structural Engineering", code: "CE-ST" }],
  },
  {
    name: "Information Technology",
    code: "IT",
    subBranches: [{ name: "IT - Web Technologies", code: "IT-WT" }],
  },
  {
    name: "Electrical Engineering",
    code: "EE",
    subBranches: [{ name: "EE - Power Systems", code: "EE-PS" }],
  },
];

export const YEARS = [1, 2, 3, 4];

export const SEMESTERS_BY_YEAR: Record<number, number[]> = {
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
};

export const SECTIONS = [1, 2, 3, 4, 5];
