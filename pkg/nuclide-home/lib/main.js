'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {GadgetsService} from '../../nuclide-gadgets-interfaces';
import type {HomeFragments} from '../../nuclide-home-interfaces';

import {CompositeDisposable, Disposable} from 'atom';
import featureConfig from '../../nuclide-feature-config';
import Immutable from 'immutable';
import Rx from 'rx';

let subscriptions: CompositeDisposable = (null: any);
let gadgetsApi: ?GadgetsService = null;

// A stream of all of the fragments. This is essentially the state of our panel.
const allHomeFragmentsStream: Rx.BehaviorSubject<Immutable.Set<HomeFragments>> =
  new Rx.BehaviorSubject(Immutable.Set());

export function activate(state: ?Object): void {
  considerDisplayingHome();
  subscriptions = new CompositeDisposable();
  subscriptions.add(
    atom.commands.add('atom-workspace', 'nuclide-home:show-settings', () => {
      atom.workspace.open('atom://config/packages/nuclide');
    })
  );
}

export function setHomeFragments(homeFragments: HomeFragments): Disposable {
  allHomeFragmentsStream.onNext(allHomeFragmentsStream.getValue().add(homeFragments));
  return new Disposable(() => {
    allHomeFragmentsStream.onNext(allHomeFragmentsStream.getValue().remove(homeFragments));
  });
}

function considerDisplayingHome() {
  if (gadgetsApi == null) {
    return;
  }
  const showHome = featureConfig.get('nuclide-home.showHome');
  if (showHome) {
    gadgetsApi.showGadget('nuclide-home');
  }
}

export function deactivate(): void {
  gadgetsApi = null;
  allHomeFragmentsStream.onNext(Immutable.Set());
  subscriptions.dispose();
  subscriptions = (null: any);
}

export function consumeGadgetsService(api: GadgetsService): IDisposable {
  const createHomePaneItem = require('./createHomePaneItem');
  gadgetsApi = api;
  const gadget = createHomePaneItem(allHomeFragmentsStream);
  const disposable = api.registerGadget(gadget);
  considerDisplayingHome();
  return disposable;
}

export function consumeToolBar(getToolBar: (group: string) => Object): void {
  const priority = require('../../nuclide-commons').toolbar.farEndPriority(500);
  const toolBar = getToolBar('nuclide-home');
  toolBar.addSpacer({
    priority: priority - 1,
  });
  toolBar.addButton({
    icon: 'gear',
    callback: 'nuclide-home:show-settings',
    tooltip: 'Open Nuclide Settings',
    priority,
  });
  subscriptions.add(new Disposable(() => {
    toolBar.removeItems();
  }));
}
