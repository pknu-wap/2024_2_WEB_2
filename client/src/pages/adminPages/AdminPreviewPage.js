import { useMemo } from "react";
import ManageVotePage from "./ManageVotePage";
import { previewProjects } from "../../data/previewProjects";

export default function AdminPreviewPage() {
  const { voteApi, projectsApi } = useMemo(() => {
    let selected = previewProjects.map((project) => project.projectId);
    let isPublic = false;
    return {
      projectsApi: { getProjectList: async () => ({ projectsResponse: previewProjects }) },
      voteApi: {
        getStatus: async () => ({ status: "NOT_CREATED" }),
        open: async (_semester, ids) => { selected = ids; },
        close: async () => {},
        setPublicStatus: async (_semester, value) => { isPublic = value; },
        getIsVoteOpen: async () => ({ isPublic }),
        getResults: async () => {
          const projects = previewProjects.filter((project) => selected.includes(project.projectId));
          const total = projects.reduce((sum, _, index) => sum + (projects.length - index) * 5, 0);
          return projects.map((project, index) => ({
            projectName: project.title,
            voteCount: (projects.length - index) * 5,
            voteRate: Math.round(((projects.length - index) * 5 / total) * 100),
          }));
        },
      },
    };
  }, []);
  return <ManageVotePage voteApi={voteApi} projectsApi={projectsApi} />;
}
