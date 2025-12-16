/*global QUnit*/

sap.ui.define([
	"sapuicom/project1/controller/Hostel.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Hostel Controller");

	QUnit.test("I should test the Hostel controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
