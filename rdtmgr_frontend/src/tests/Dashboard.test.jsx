import '@testing-library/dom';

import React from 'react';
import { Dashboard } from '../pages/Dashboard';
import { FilterContext } from '../Context';
import { AppContext } from '../Context';
import { Shallow } from './setupTest'

describe('Test in <DashBoard />', () => {
	test ('No 1', () => {
		const context = {
			api: {
				main: process.env.REACT_APP_API,
				webSocket: process.env.REACT_APP_WS
			}
		};

		const filter = {
			date: new Date(),
			dateRange: [new Date(), new Date()+1],
			timeFilter: 'Shift',
			shiftFilter: 'Third',
			weekFilter: null,
			search: undefined,
			changed: false,
			shiftFilters: null,
			setFilters: null
		};

		const wrapper = Shallow(
			<AppContext.Provider value = {context}>
				<FilterContext.Provider value= {filter}>
					<Dashboard />
				</FilterContext.Provider>
			</AppContext.Provider>
		);

		expect(wrapper).toMatchSnapshot();
	})
})