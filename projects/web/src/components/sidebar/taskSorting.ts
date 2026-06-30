import type { TaskPreview } from "@/persistence/repoStore"

const zeroTime = new Date(0).toISOString()

export type SidebarSortableTask = Pick<TaskPreview, "id" | "closed" | "createdAt" | "lastEvent">

export function compareTaskPreviewsByRecent(a: SidebarSortableTask, b: SidebarSortableTask): number {
    const aTime = a.lastEvent?.at ?? a.createdAt ?? zeroTime
    const bTime = b.lastEvent?.at ?? b.createdAt ?? zeroTime
    return bTime.localeCompare(aTime)
}

function withRunningFirst<T extends SidebarSortableTask>(previews: T[], runningTaskIds: Set<string>): T[] {
    const running = previews.filter((task) => runningTaskIds.has(task.id))
    const idle = previews.filter((task) => !runningTaskIds.has(task.id))
    return [...running, ...idle]
}

export function sortTaskPreviewsLikeSidebar<T extends SidebarSortableTask>(
    previews: T[],
    options: {
        pinnedTaskIds?: Iterable<string>
        runningTaskIds?: Iterable<string>
    } = {}
): T[] {
    const pinnedSet = new Set(options.pinnedTaskIds ?? [])
    const runningSet = new Set(options.runningTaskIds ?? [])

    const openPreviews = previews.filter((task) => !task.closed).sort((a, b) => compareTaskPreviewsByRecent(a, b))
    const pinnedOpen = withRunningFirst(
        openPreviews.filter((task) => pinnedSet.has(task.id)),
        runningSet
    )
    const unpinnedOpen = withRunningFirst(
        openPreviews.filter((task) => !pinnedSet.has(task.id)),
        runningSet
    )
    const closedPreviews = previews.filter((task) => task.closed).sort((a, b) => compareTaskPreviewsByRecent(a, b))
    const pinnedClosed = closedPreviews.filter((task) => pinnedSet.has(task.id))
    const unpinnedClosed = closedPreviews.filter((task) => !pinnedSet.has(task.id))

    return [...pinnedOpen, ...unpinnedOpen, ...pinnedClosed, ...unpinnedClosed]
}
