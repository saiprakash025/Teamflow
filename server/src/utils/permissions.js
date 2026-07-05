// server/src/utils/permissions.js
function getProjectMemberRole(project, userId) {
  if (!project.members) return null;
  const member = project.members.find((m) => m.user.toString() === userId);
  return member ? member.role : null;
}

function canEditProject(project, user) {
  const isOwner = project.owner.toString() === user.userId;
  const memberRole = getProjectMemberRole(project, user.userId);
  const isProjectAdmin = memberRole === 'admin';
  const isGlobalAdmin = user.role === 'admin';

  return isOwner || isProjectAdmin || isGlobalAdmin;
}

function canEditTask(project, user) {
  const isOwner = project.owner.toString() === user.userId;
  const memberRole = getProjectMemberRole(project, user.userId);
  const isGlobalAdmin = user.role === 'admin';

  return isOwner || memberRole === 'member' || memberRole === 'admin' || isGlobalAdmin;
}

function canViewProject(project, user) {
  const isOwner = project.owner.toString() === user.userId;
  const memberRole = getProjectMemberRole(project, user.userId);
  const isGlobalAdmin = user.role === 'admin';

  return isOwner || !!memberRole || isGlobalAdmin;
}

module.exports = {
  getProjectMemberRole,
  canEditProject,
  canEditTask,
  canViewProject,
};