import '@testing-library/dom';

import React from 'react';
import { AppContext } from '../Context';
import { Shallow } from './setupTest'

describe('Test in <Context />', () => {
	test ('No 1', () => {
		const context = {
			api: {
				main: process.env.REACT_APP_API,
				webSocket: process.env.REACT_APP_WS
			}
		};

		const wrapper = Shallow(
			<AppContext.Provider value = {context}>
			</AppContext.Provider>
		);

		expect(wrapper).toMatchSnapshot();
	})
})