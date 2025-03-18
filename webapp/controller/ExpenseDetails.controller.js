sap.ui.define([
	"./BaseController",
    "sap/ui/core/BusyIndicator",
	"sap/ui/model/json/JSONModel"
], function(Controller, BusyIndicator, JSONModel) {
	"use strict";
	return Controller.extend("sap.kt.com.minihrsolution.controller.ExpenseDetails", {

        onInit: function() {
            this.getRouter().getRoute("RouteExpensDetails").attachMatched(this._onRouteMatched, this);
        },

		_onRouteMatched:function(oEvent){
			this.ExpenseID = oEvent.getParameter("arguments").sPath;
			var oModel = this.getView().getModel("ExpenseModel");
			
			var oData = new JSONModel( oModel.getProperty("/expenses")[parseInt(this.ExpenseID) - 1]);
			this.getView().setModel(oData, "FilteredExpenseModel");
			this.ViewModel = this.getView().getModel("viewModel");
		},

		onPressExpenseDownload:function(){
			let fileUrl = window.location.href.split("index")[0] + "/Perdiem_DeclarationForm.doc";
			sap.m.URLHelper.redirect(fileUrl, true);
		},

		openFragment: function(){
			var oView = this.getView();
			if (!this.ExpenseItem) {
			  this.ExpenseItem = sap.ui.core.Fragment.load({
				name: "sap.kt.com.minihrsolution.fragment.AddItemExpense",
				controller: this
			  }).then(function (ExpenseItem) {
				this.ExpenseItem = ExpenseItem;
				oView.addDependent(this.ExpenseItem);
				this.ExpenseItem.open();
			  }.bind(this));
			} else {			 
			  this.ExpenseItem.open();
			}
		},

		onPressAddExpenseItem:function(){
			this.ViewModel.setProperty("/SubmitBtn", true);
			this.ViewModel.setProperty("/SaveBtn", false);
			this.openFragment();
		},

		onPressExpenseItemEdit:function(){
			this.ViewModel.setProperty("/SubmitBtn", false);
			this.ViewModel.setProperty("/SaveBtn", true);
			this.openFragment();
        },

		onPressClose:function(){
			this.ExpenseItem.close();
		},

		onPressBackBtn:function(){
			this.getRouter().navTo("RouteExpensePage");
        }
	});
});