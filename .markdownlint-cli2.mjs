// Markdown lint rules for authored documentation.
//
// The disabled set matches SovereignAgenticArchitecture so prose moves between the
// two repositories without reformatting.
export default {
  config: {
    default: true,
    MD013: false, // line length is handled by the editor, not the linter
    MD024: false, // repeated headings are legitimate in ADRs and changelogs
    MD025: false, // front matter title plus an H1 is not a duplicate
    MD033: false, // inline HTML is occasionally the only way to say something
    MD036: false, // bold used as a lead-in is deliberate
    MD041: false, // a pointer file may open with a sentence, not a heading
    MD046: false, // both fenced and indented code blocks appear in generated output
    MD060: false, // compact table pipes
  },
  globs: ["**/*.md"],
  ignores: ["**/node_modules/**", "**/dist/**", "fixtures/**", ".changeset/**"],
};
