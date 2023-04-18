import App from '@/app';
import AuthRoute from '@routes/auth.route';
import IndexRoute from '@routes/index.route';
import UsersRoute from '@routes/users.route';
import walletRoute from './routes/wallet.route';
import validateEnv from '@utils/validateEnv';
import sellerRoute from './routes/seller.route';
import postRoute from './routes/post.route';

validateEnv();

const app = new App([new IndexRoute(), new UsersRoute(), new AuthRoute(), new postRoute(), new walletRoute(), new sellerRoute()]);

app.listen();
