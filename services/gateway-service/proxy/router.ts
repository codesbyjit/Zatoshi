import { Router } from "express"
import httpProxy from "http-proxy"

const router = Router();
const proxy = httpProxy.createProxyServer();

router.use("/auth", (req, res)=>{
    proxy.web(req, res, {target: process.env.AUTH_URL || "http://localhost:4001"})
})
router.use("/user", (req, res)=>{
    proxy.web(req, res, {target: process.env.USER_URL || "http://localhost:4002"})
})
router.use("/products", (req, res)=>{
    proxy.web(req, res, {target: process.env.PRODUCT_URL || "http://localhost:4003"})
})

export default router;