import { t } from './trpc';
import { authRouter } from '../routers/auth';
import { productRouter } from '../routers/product';
import { categoryRouter } from '../routers/category';
import { orderRouter } from '../routers/order';
import { cartRouter } from '../routers/cart';
import { userRouter } from '../routers/user';
import { analyticsRouter } from '../routers/analytics';
import { recommendationsRouter as recommendationRouter } from '../routers/recommendations';
import { analyticsTrackingRouter } from '../routers/analytics-tracking';
import { reviewsRouter } from '../routers/reviews';

/**
 * Root tRPC router — merges all sub-routers.
 */
export const appRouter = t.router({
  auth: authRouter,
  product: productRouter,
  category: categoryRouter,
  order: orderRouter,
  cart: cartRouter,
  user: userRouter,
  analytics: analyticsRouter,
  recommendation: recommendationRouter,
  analyticsTracking: analyticsTrackingRouter,
  reviews: reviewsRouter,
});

export type AppRouter = typeof appRouter;
