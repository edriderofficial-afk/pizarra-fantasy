import { config } from '@pizarra/config/eslint';

export default [...config({ react: true }), { ignores: ['dist/**', 'expo-env.d.ts', '*.js'] }];
