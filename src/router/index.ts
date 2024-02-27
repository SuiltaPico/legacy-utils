import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router"

export const raw_routes = [
  { name: "index", alias: "/" },
  "file_sounds",
  // {
  //   name: "在线 Python",
  //   path: "python_online"
  // },
   /*{
    path: "batch_file_renaming",
    name: "文件批量重命名"
  }*/, {
    path: "fn_sound",
    name: "函数声音合成"
  }
] as (string | {
  name: string,
  alias?: string,
  path?: string,
})[]

export const routes: RouteRecordRaw[] = []

raw_routes.forEach(rr => {
  let route: RouteRecordRaw
  if (typeof rr === "string") {
    route = {
      name: rr,
      path: `/${rr}`,
      component: () => import(`../pages/${rr}.vue`)
    }
  } else {
    route = {
      name: rr.name,
      path: `/${rr.path ?? rr.name}`,
      component: () => import(`../pages/${rr.path ?? rr.name}.vue`),
    }
    if (rr.alias) { route.alias = rr.alias }
  }

  routes.push(route)
})

const router = createRouter({
  history: createWebHashHistory("/utils/"),
  routes,
})

router.beforeEach((rl) => {
  document.title = String(rl.name)
})

export default router