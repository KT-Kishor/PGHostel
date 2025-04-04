sap.ui.define([
	"./BaseController",
	"sap/ui/core/BusyIndicator",
	"sap/ui/model/json/JSONModel",
	"../utils/validation",
	"sap/m/MessageToast",
], function (Controller, BusyIndicator, JSONModel, utils, MessageToast) {
	"use strict";
	return Controller.extend("sap.kt.com.minihrsolution.controller.ExpenseDetails", {

		onInit: function () {
			this.getRouter().getRoute("RouteExpensDetails").attachMatched(this._onRouteMatched, this);
			this._fetchCommonData("Currency", "CurrencyModel");
		},

		_onRouteMatched: async function (oEvent) {
			this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
			this.ExpenseID = oEvent.getParameter("arguments").sPath;			
			this._fetchCommonData("Expense", "FilteredExpenseModel",{ExpenseID:this.ExpenseID});

			var viewModel = new JSONModel({ isEditMode: false, status: true, editable: false, enable: true, enableDelete: true });
			this.getView().setModel(viewModel, "viewModel");
			this.LoginModel = this.getView().getModel("LoginModel");

			await this._fetchCommonData("ItemExpense", "ItemExpenseModel", { EmployeeID: this.LoginModel.getProperty("/EmployeeID") });
			this.IndexNoIncreent();

			this.ViewModel = this.getView().getModel("viewModel");
			BusyIndicator.hide();
		},

		IndexNoIncreent: function () {
			let modelData = this.getView().getModel("ItemExpenseModel").getData();
			modelData.forEach((item, index) => {
				item.IndexNo = index + 1;
				this.IndexNo = index + 1;
			});
			this.getView().getModel("ItemExpenseModel").setData(modelData);
		},

		onPressExpenseDownload: function () {
			let fileUrl = window.location.href.split("index")[0] + "/Perdiem_DeclarationForm.doc";
			sap.m.URLHelper.redirect(fileUrl, true);
		},

		openFragment: function () {
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

		Exp_onChangeExpanesItem: function (oEvent) {
			this.SelectedData = oEvent.getSource().getSelectedItem().getBindingContext("ItemExpenseModel").getObject();
		},

		onPressAddExpenseItem: function () {
			this.ViewModel.setProperty("/SubmitBtn", true);
			this.ViewModel.setProperty("/enable", true);
			this.ViewModel.setProperty("/SaveBtn", false);
			var jsonExpense = {
				EmployeeID: this.LoginModel.getProperty("/EmployeeID"),
				EmployeeName: this.LoginModel.getProperty("/EmployeeName"),
				IndexNo: this.IndexNo + 1,
				ItemType: "Bus",
				ExpenseAmount: "",
				Currency: "INR",
				ModeOfPayment: "Employee",
				ExpenseDate: this.getView().getModel("FilteredExpenseModel").getData().ExpEndDate,
				Comments: "",
				Submit: true,
				Save: false,
				ConversionRate: "",
				ForeignAmount: ""
			};
			var oExpenseCreateModel = new JSONModel(jsonExpense);
			this.getView().setModel(oExpenseCreateModel, "ExpenseCreateModel");
			this.openFragment();
		},

		onPressExpenseItemEdit: function () {
			this.ViewModel.setProperty("/SubmitBtn", false);
			this.ViewModel.setProperty("/SaveBtn", true);
			this.openFragment();
			var jsonExpense = {
				IndexNo: this.SelectedData.IndexNo,
				ItemID: this.SelectedData.ItemID,
				ItemType: this.SelectedData.ItemType,
				ExpenseAmount: this.SelectedData.ExpenseAmount,
				Currency: this.SelectedData.Currency,
				Attachment: this.SelectedData.Attachment,
				ModeOfPayment: this.SelectedData.ModeOfPayment,
				ExpenseDate: this.SelectedData.ExpenseDate,
				Comments: this.SelectedData.Comments,
				ConversionRate: this.SelectedData.ConversionRate,
				ForeignAmount: this.SelectedData.ForeignAmount,
				Submit: false,
				Save: true
			};
			var oExpenseCreateModel = new JSONModel(jsonExpense);
			this.getView().setModel(oExpenseCreateModel, "ExpenseCreateModel");
		},

		onPressClose: function () {
			this.ExpenseItem.close();
		},

		onPressBackBtn: function () {
			this.getRouter().navTo("RouteExpensePage");
		},

		onEditOrSavePress: function () {
			var isEditMode = this.ViewModel.getProperty("/isEditMode");
			if (isEditMode) {
				this.onPressSave();
			} else {
				this.onMyButtonPressEdit();
			}
		},

		onMyButtonPressEdit: function () {
			this.ViewModel.setProperty("/editable", true);
			this.ViewModel.setProperty("/isEditMode", true);
			this.ViewModel.setProperty("/enable", false);
			this.ViewModel.setProperty("/enableDelete", false);
		},

		LC_ExpAmount: function (oEvent) {
			utils._LCvalidateAmount(oEvent);
		},

		LC_ExpConversionRate: function (oEvent) {
			utils._LCvalidateAmount(oEvent);
		},

		LC_ExpComments: function (oEvent) {
			utils._LCvalidateMandatoryField(oEvent);
		},

		onPressSave: function () {
			if (utils._LCvalidateMandatoryField(this.byId("Exp_id_Source"), "ID") && utils._LCvalidateMandatoryField(this.byId("Exp_id_Destination"), "ID") && utils._LCvalidateMandatoryField(this.byId("Exp_id_Country"), "ID") && utils._LCvalidateMandatoryField(this.byId("Exp_id_EmpRemark"), "ID")) {
				var oModel = this.getView().getModel("FilteredExpenseModel");
				var oData = {
					"data": oModel.getData(),
					"filters": {
						"ExpenseID": oModel.getData().ExpenseID
					}
				}
				this.ajaxUpdateWithJQuery("Expense", oData).then((oData) => {
					if (oData) {
						this.ViewModel.setProperty("/editable", false);
						this.ViewModel.setProperty("/isEditMode", false);
						this.ViewModel.setProperty("/enable", true);
						this.ViewModel.setProperty("/enableDelete", true);
						MessageToast.show("Update")
					}
				}).catch((oError) => {
					sap.ui.core.BusyIndicator.hide();
					MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
				})
			} else {
				MessageToast.show(this.i18nModel.getText("mandetoryFields"));
			}
		},

		async onPressSubmit() {
			try {
				var oModel = this.getView().getModel("ExpenseCreateModel").getData();
				if (utils._LCvalidateDate(sap.ui.getCore().byId("ExpDet_id_ExpenseDate"), "ID") &&
					utils._LCvalidateAmount(sap.ui.getCore().byId("ExpDet_id_Amount"), "ID") &&
					utils._LCvalidateMandatoryField(sap.ui.getCore().byId("ExpDet_id_Comments"), "ID") &&
					(oModel.Currency !== "INR" ? utils._LCvalidateAmount(sap.ui.getCore().byId("ExpDet_id_ConvertionRate"), "ID") : true)) {
					var oData = {
						data: {
							Comments: oModel.Comments,
							ExpenseID: this.getView().getModel("FilteredExpenseModel").getData().ExpenseID,
							ConversionRate: oModel.ConversionRate,
							Currency: oModel.Currency,
							EmployeeID: oModel.EmployeeID,
							ExpenseAmount: oModel.ExpenseAmount,
							ExpenseDate: oModel.ExpenseDate,
							ForeignAmount: oModel.ForeignAmount,
							ItemType: oModel.ItemType,
							ModeOfPayment: oModel.ModeOfPayment
						}
					};

					try {
						const oCreateResponse = await this.ajaxCreateWithJQuery("ItemExpense", oData);
						if (oCreateResponse) {
							MessageToast.show(this.i18nModel.getText("offerSuccess"));
							await this._fetchCommonData("ItemExpense", "ItemExpenseModel", { EmployeeID: this.LoginModel.getProperty("/EmployeeID") });
							this.IndexNoIncreent();
							this.ExpenseItem.close();
							BusyIndicator.hide();
						}
					} catch (oError) {
						BusyIndicator.hide();
						MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
					}
				} else {
					MessageToast.show(this.i18nModel.getText("mandetoryFields"));
				}
			} catch (error) {
				console.log(error);
			}
		},

		async onPressSaveExpense() {
			try {
				var oModel = this.getView().getModel("ExpenseCreateModel").getData();
				if (utils._LCvalidateDate(sap.ui.getCore().byId("ExpDet_id_ExpenseDate"), "ID") &&
					utils._LCvalidateAmount(sap.ui.getCore().byId("ExpDet_id_Amount"), "ID") &&
					utils._LCvalidateMandatoryField(sap.ui.getCore().byId("ExpDet_id_Comments"), "ID") &&
					(oModel.Currency !== "INR" ? utils._LCvalidateAmount(sap.ui.getCore().byId("ExpDet_id_ConvertionRate"), "ID") : true)) {
					var oData = {
						data: {
							Comments: oModel.Comments,
							ExpenseID: this.getView().getModel("FilteredExpenseModel").getData().ExpenseID,
							ConversionRate: oModel.ConversionRate,
							Currency: oModel.Currency,
							EmployeeID: oModel.EmployeeID,
							ExpenseAmount: oModel.ExpenseAmount,
							ExpenseDate: oModel.ExpenseDate,
							ForeignAmount: oModel.ForeignAmount,
							ItemType: oModel.ItemType,
							ModeOfPayment: oModel.ModeOfPayment
						}, "filters": {
							"ItemID": this.SelectedData.ItemID
						}
					};
					this.ajaxUpdateWithJQuery("ItemExpense", oData).then((oData) => {
						if (oData) {
							this._fetchCommonData("ItemExpense", "ItemExpenseModel", { EmployeeID: this.LoginModel.getProperty("/EmployeeID") });
							this.ExpenseItem.close();
							BusyIndicator.hide();
							MessageToast.show("Update")
						}
					}).catch((oError) => {
						sap.ui.core.BusyIndicator.hide();
						MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
					})
				} else {
					MessageToast.show(this.i18nModel.getText("mandetoryFields"));
				}
			} catch (error) {
				console.log(error);
			}
		},

		onPressExpenseItemDelete: function (oEvent) {
			var ExpID = this.SelectedData.ItemID;
			this.ajaxDeleteWithJQuery("/ItemExpense", { filters: { ItemID : ExpID } }).then(() => {
				MessageToast.show(this.i18nModel.getText("msgCustomerDeleteSuccess"));
				this._fetchCommonData("ItemExpense", "ItemExpenseModel", { EmployeeID: this.LoginModel.getProperty("/EmployeeID") });
			}).catch((error) => {
				MessageToast.show(error.responseText);
			});
		},

		ExpenseTotalCalculation:function(){
			var oModel = this.getView().getModel("FilteredExpenseModel").getData();
			this._fetchCommonData("ExpenseTotalCalculation", "", { EmployeeID: oModel.EmployeeID, ExpenseID:oModel.ExpenseID });

			this._fetchCommonData("Expense", "FilteredExpenseModel",{ExpenseID:this.ExpenseID});
		}
	});
});