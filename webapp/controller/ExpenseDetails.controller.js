sap.ui.define([
    "./BaseController",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "sap/m/MessageToast",
    "../model/formatter",
    "sap/m/MessageBox",
    "sap/suite/ui/commons/Timeline", // Import Timeline for displaying comments
    "sap/suite/ui/commons/TimelineItem" //Import TimelineItem for individual comments
  ],
  function (Controller,BusyIndicator,JSONModel,utils,MessageToast,Formatter,MessageBox,Timeline,TimelineItem) {
    "use strict";
    return Controller.extend("sap.kt.com.minihrsolution.controller.ExpenseDetails",{
        Formatter: Formatter,
        onInit:async function () {
          this.getRouter().getRoute("RouteExpensDetails").attachMatched(this._onRouteMatched, this);
          await this._fetchCommonData("Currency", "CurrencyModel");
        },

        _onRouteMatched: async function (oEvent) {
          // this.commonLoginFunction("Expense");
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          this.ExpenseID = oEvent.getParameter("arguments").sPath;
          await this._fetchCommonData("Expense", "FilteredExpenseModel", {ExpenseID: this.ExpenseID,});

          var viewModel = new JSONModel({isEditMode: false,status: true,editable: false,enable: true,enableDelete: true,required: false,SubmitBtn: false,SaveBtn: false,});

          this.getView().setModel(viewModel, "viewModel");
          this.LoginModel = this.getView().getModel("LoginModel");

          this.IndexNoIncreent();

          this.ViewModel = this.getView().getModel("viewModel");
          this.FilteredExpenseModel = this.getView().getModel("FilteredExpenseModel").getData();

          if (this.FilteredExpenseModel[0].Status === "Submitted" || this.FilteredExpenseModel[0].Status === "Send to account") {
            this.byId("exp_Id_ExpenseTable").setMode(sap.m.ListMode.None);
          } else {
            this.byId("exp_Id_ExpenseTable").setMode(sap.m.ListMode.SingleSelectLeft);
          }
          if (this.FilteredExpenseModel[0].Status === "Draft" || this.FilteredExpenseModel[0].Status === "Send back by manager" || this.FilteredExpenseModel[0].Status === "Send back by account") {
            this.ViewModel.setProperty("/status", true);
          } else {
            this.ViewModel.setProperty("/status", false);
          }
          if (this.FilteredExpenseModel[0].TripType !== "Customer Facing") this.ViewModel.setProperty("/required", false);          

          this.ExpenseTotalCalculation();
          BusyIndicator.hide();
        },

        IndexNoIncreent: function () {
          var that = this;
          var oView = this.getView();
                
          oView.setBusy(true);
        
          this._fetchCommonData("ItemExpense", "ItemExpenseModel", {
            EmployeeID: this.LoginModel.getProperty("/EmployeeID"),
            ExpenseID: this.ExpenseID
          })
          .then(function () {
            let modelData = oView.getModel("ItemExpenseModel").getData();
        
            if (!Array.isArray(modelData) || modelData.length === 0) {
              that.IndexNo = 0;
              return;
            }
        
            modelData.forEach((item, index) => {
              item.IndexNo = index + 1;
              that.IndexNo = index + 1;
            });
        
            oView.getModel("ItemExpenseModel").setData(modelData);
          })
          .catch(function (error) {         
            that.IndexNo = 0;
          })
          .finally(function () {          
            oView.setBusy(false);
          });
        },             

        Exp_Det_onPressExpenseDownload: function () {
          let fileUrl =window.location.href.split("index")[0] +"/Perdiem_DeclarationForm.doc";
          sap.m.URLHelper.redirect(fileUrl, true);
        },

        openFragment: function () {
          var oView = this.getView();
          var oModel = oView.getModel("FilteredExpenseModel").getData()[0];
          this.ViewModel.setProperty("/MinDate",new Date(oModel.ExpStartDate.split("/").reverse().join("-")));
          this.ViewModel.setProperty("/MaxDate",new Date(oModel.ExpEndDate.split("/").reverse().join("-")));
          if (!this.ExpenseItem) {
            this.ExpenseItem = sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.AddItemExpense",
              controller: this,
            }).then(
              function (ExpenseItem) {
                this.ExpenseItem = ExpenseItem;
                oView.addDependent(this.ExpenseItem);
                this.ExpenseItem.open();
              }.bind(this)
            );
          } else {
            this.ExpenseItem.open();
          }
        },

        Exp_Det_onChangeExpanesItem: function (oEvent) {
          this.SelectedData = oEvent.getSource().getSelectedItem().getBindingContext("ItemExpenseModel").getObject();
          if (this.SelectedData.ItemType === "Peridiem") {
            this.ViewModel.setProperty("/enable", true);
            this.ViewModel.setProperty("/enableDelete", false);
          } else {
            this.ViewModel.setProperty("/enable", true);
            this.ViewModel.setProperty("/enableDelete", true);
          }
        },

        Exp_Det_onPressAddExpenseItem: function () {
          this.ViewModel.setProperty("/SubmitBtn", true);
          this.ViewModel.setProperty("/enable", true);
          this.ViewModel.setProperty("/SaveBtn", false);
          var jsonExpense = {
            EmployeeID: this.LoginModel.getProperty("/EmployeeID"),
            EmployeeName: this.LoginModel.getProperty("/EmployeeName"),
            IndexNo: this.IndexNo + 1,
            ItemType: "Bus",
            ExpenseAmount: "0",
            Currency: "INR",
            ModeOfPayment: "Employee",
            ExpenseDate: this.Formatter.formatDate(this.getView().getModel("FilteredExpenseModel").getData()[0].ExpEndDate),
            Comments: "",
            Submit: true,
            Save: false,
            ConversionRate: "0",
            ForeignAmount: "0",
          };
          var oExpenseCreateModel = new JSONModel(jsonExpense);
          this.getView().setModel(oExpenseCreateModel, "ExpenseCreateModel");
          this.openFragment();
        },

        Exp_Det_onPressExpenseItemEdit: function () {
          if (this.byId("exp_Id_ExpenseTable").getSelectedItem() === null) {
            return MessageToast.show(this.i18nModel.getText("expenseEditSelectRowMess"));
          }
          this.ViewModel.setProperty("/SubmitBtn", false);
          this.ViewModel.setProperty("/SaveBtn", true);
          this.openFragment();
          var jsonExpense = {
            IndexNo: this.SelectedData.IndexNo,
            ItemID: this.SelectedData.ItemID,
            ItemType: this.SelectedData.ItemType,
            ExpenseAmount: this.SelectedData.Currency === "INR" ? this.SelectedData.ExpenseAmount : this.SelectedData.ForeignAmount,
            Currency: this.SelectedData.Currency,
            Attachment: this.SelectedData.Attachment,
            ModeOfPayment: this.SelectedData.ModeOfPayment,
            ExpenseDate: this.Formatter.formatDate(this.SelectedData.ExpenseDate),
            Comments: this.SelectedData.Comments,
            ConversionRate: this.SelectedData.ConversionRate,
            ForeignAmount: this.SelectedData.ForeignAmount,
            Submit: false,
            Save: true,
          };
          var oExpenseCreateModel = new JSONModel(jsonExpense);
          this.getView().setModel(oExpenseCreateModel, "ExpenseCreateModel");
        },

        Exp_Det_onPressClose: function () {
          sap.ui.getCore().byId("ExpDet_id_Amount").setValueState("None");
          sap.ui.getCore().byId("ExpDet_id_ConvertionRate").setValueState("None");
          sap.ui.getCore().byId("ExpDet_id_Comments").setValueState("None");
          this.ExpenseItem.close();
        },

        Exp_Det_onPressBackBtn: function () {
          this.getRouter().navTo("RouteExpensePage");
        },

        Exp_Det_onEditOrSavePress: function () {
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
        
        onLiveChangeEmployeeRemark:function(oEvent){
          utils._LCvalidateMandatoryField(oEvent);
        },

        onPressSave:async function () {
          if (
            utils._LCvalidateMandatoryField(this.byId("Exp_id_Source"), "ID") &&
            (this.ViewModel.getProperty("/required") === true ? utils._LCvalidateMandatoryField(this.byId("Exp_id_Destination"),"ID") : true) && utils._LCvalidateMandatoryField(this.byId("Exp_id_Country"),"ID") && utils._LCvalidateMandatoryField(this.byId("Exp_id_EmpRemark"), "ID")) {
            BusyIndicator.show(0);
            var oModel = this.getView().getModel("FilteredExpenseModel");
            oModel.getData()[0].ExpStartDate = oModel.getData()[0].ExpStartDate.split("T")[0];
            oModel.getData()[0].ExpEndDate = oModel.getData()[0].ExpEndDate.split("T")[0];
            delete oModel.getData()[0].Comments;
            var oData = {
              data: oModel.getData()[0],
              filters: {
                ExpenseID: oModel.getData()[0].ExpenseID,
              },
            };
            await this.ajaxUpdateWithJQuery("Expense", oData)
              .then((oData) => {
                if (oData) {
                  this.ViewModel.setProperty("/editable", false);
                  this.ViewModel.setProperty("/isEditMode", false);
                  this.ViewModel.setProperty("/enable", true);
                  this.ViewModel.setProperty("/enableDelete", true);
                  MessageToast.show(this.i18nModel.getText("expenseUpdateMess"));
                  BusyIndicator.hide();
                }else{
                  MessageToast.show(this.i18nModel.getText("expenseUpdateMessFailed"));
                  BusyIndicator.hide();
                }
              })
              .catch((oError) => {
                BusyIndicator.hide();
                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
              });
          } else {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
          }
        },

        Exp_Frg_onItemTypeChange: function (oEvent) {
          var oText = oEvent.getSource().getSelectedItem().getText();
          if (oText === "Peridiem Declaration") {
            this.ViewModel.setProperty("/enable", false);
          } else {
            this.ViewModel.setProperty("/enable", true);
          }
        },

        async Exp_Det_onPressSubmit() {
          var oModel = this.getView().getModel("ExpenseCreateModel").getData();
          if (utils._LCvalidateDate(sap.ui.getCore().byId("ExpDet_id_ExpenseDate"),"ID") && (oModel.ItemType !== "Peridiem Declaration"? utils._LCvalidateAmount(sap.ui.getCore().byId("ExpDet_id_Amount"),"ID") : true) && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("ExpDet_id_Comments"),"ID") && (oModel.Currency !== "INR" ? utils._LCvalidateAmount(sap.ui.getCore().byId("ExpDet_id_ConvertionRate"),"ID") : true)) {
            BusyIndicator.show(0);
            var FilterModel = this.getView().getModel("FilteredExpenseModel").getData()[0];
            if (oModel.Currency !== "INR") this.Exp_Frg_onChangeConverstionRate();

            var oData = {
              data: {
                Comments: oModel.Comments,
                ExpenseID: FilterModel.ExpenseID,
                ConversionRate:oModel.Currency !== "INR" ? oModel.ConversionRate : "1",
                Currency: oModel.Currency,
                EmployeeID: FilterModel.EmployeeID,
                ExpenseAmount:oModel.Currency !== "INR" ? oModel.TotalAmount : oModel.ExpenseAmount,
                ExpenseDate: oModel.ExpenseDate.split("/").reverse().join("-"),
                ForeignAmount: oModel.ExpenseAmount,
                ItemType: oModel.ItemType,
                ModeOfPayment: oModel.ModeOfPayment,
              },
            };
            try {
              const oCreateResponse = await this.ajaxCreateWithJQuery("ItemExpense",oData);
              if (oCreateResponse) {
                MessageToast.show(this.i18nModel.getText("expenseCreatedMess"));
                this.IndexNoIncreent();
                this.ViewModel.setProperty("/enable", true);
                this.ExpenseItem.close();
                this.ExpenseTotalCalculation();
                BusyIndicator.hide();
              }else{
                MessageToast.show(this.i18nModel.getText("expenseCreatedMessFailed"));
                BusyIndicator.hide();
              }
            } catch (oError) {
              BusyIndicator.hide();
              MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
            }
          } else {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
          }
        },

        async Exp_Det_onPressSaveExpense() {         
            var oModel = this.getView().getModel("ExpenseCreateModel").getData();
            var FilterModel = this.getView().getModel("FilteredExpenseModel").getData()[0];
            if (utils._LCvalidateDate(sap.ui.getCore().byId("ExpDet_id_ExpenseDate"),"ID") && utils._LCvalidateAmount(sap.ui.getCore().byId("ExpDet_id_Amount"),"ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("ExpDet_id_Comments"),"ID") && (oModel.Currency !== "INR"? utils._LCvalidateAmount(sap.ui.getCore().byId("ExpDet_id_ConvertionRate"),"ID"): true)) {
              BusyIndicator.show(0);
              if (oModel.Currency !== "INR") this.Exp_Frg_onChangeConverstionRate();

              var oData = {
                data: {
                  Comments: oModel.Comments,
                  ExpenseID: FilterModel.ExpenseID,
                  ConversionRate:oModel.Currency !== "INR" ? oModel.ConversionRate : "1",
                  Currency: oModel.Currency,
                  EmployeeID: FilterModel.EmployeeID,
                  ExpenseAmount:oModel.Currency !== "INR"? oModel.TotalAmount : oModel.ExpenseAmount,
                  ExpenseDate: oModel.ExpenseDate.split("/").reverse().join("-"),
                  ForeignAmount: oModel.ExpenseAmount,
                  ItemType: oModel.ItemType,
                  ModeOfPayment: oModel.ModeOfPayment,
                },
                filters: {ItemID: this.SelectedData.ItemID,},
              };
              await this.ajaxUpdateWithJQuery("ItemExpense", oData)
                .then((oData) => {
                  if (oData) {
                    this.IndexNoIncreent();
                    this.ExpenseTotalCalculation();
                    this.ExpenseItem.close();
                    MessageToast.show(this.i18nModel.getText("expenseUpdateMess"));
                    BusyIndicator.hide();
                  }else{
                    MessageToast.show(this.i18nModel.getText("expenseUpdateMessFailed"));
                    BusyIndicator.hide();
                  }
                })
                .catch((oError) => {
                  BusyIndicator.hide();
                  MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                });
            } else {
              MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            }         
        },

        Exp_Det_onPressExpenseItemDelete: async function (oEvent) {
          try {
            if (this.byId("exp_Id_ExpenseTable").getSelectedItem() === null) { return MessageToast.show(this.i18nModel.getText("expenseDeleteSelectRowMess")); }
            BusyIndicator.show(0);
            var ExpID = this.SelectedData.ItemID;
            await this.ajaxDeleteWithJQuery("/ItemExpense", {filters: { ItemID: ExpID },});
            MessageToast.show(this.i18nModel.getText("expenseDeleteMess"));
            this.IndexNoIncreent();
            this.ExpenseTotalCalculation();
            BusyIndicator.hide();
          } catch (error) {
            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
          }
        },

        ExpenseTotalCalculation: async function () {
          await this._fetchCommonData("ExpenseTotalCalculation", "", {ExpenseID: this.ExpenseID});
          await this._fetchCommonData("Expense", "FilteredExpenseModel", {ExpenseID: this.ExpenseID});
        },

        Exp_Det_onPressSubmitExpenseItems: function () {
          var that = this;
          var oModelData = that.getView().getModel("FilteredExpenseModel").getData()[0];
          // Check if Total Amount is valid
          if (oModelData.TotalAmount <= 0) {
            return MessageBox.error(that.i18nModel.getText("expenseTotalAmountMess"));           
          }
          var itemExpenses = that.getView().getModel("ItemExpenseModel").getData();

          // Validate Travel Allowance and Per Diem Declaration
          if (oModelData.TravelAllowance === "Yes") {
            var hasPerDiemDeclaration = itemExpenses.some(function (item) {
              return item.ItemType === "Peridiem Declaration";
            });

            if (!hasPerDiemDeclaration) {
              return MessageBox.error(that.i18nModel.getText("expensePerdiemDeclarationValidation"));
            }
          }
          // Checkbox for confirmation
          var checkbox = new sap.m.CheckBox({
            text: that.i18nModel.getText("expenseSubmittedMess"),
            selected: false,
          });
          // Dialog for submission confirmation
          var dialog = new sap.m.Dialog({
            title: that.i18nModel.getText("confirmTitle"),
            type: sap.m.DialogType.Message,
            content: [checkbox],
            beginButton: new sap.m.Button({
              text: "OK",
              type: "Emphasized",
              press: function () {
                if (checkbox.getSelected()) {
                  BusyIndicator.show(0);
                  var inboxData = {
                    data: {
                      ExpenseID: oModelData.ExpenseID,
                      EmployeeID: oModelData.EmployeeID,
                      EmployeeName: oModelData.EmployeeName,
                      Type: "Expense",
                      TripType: oModelData.TripType,
                      ExpStartDate: oModelData.ExpStartDate,
                      ExpEndDate: oModelData.ExpEndDate,
                      SubmittedDate: that.Formatter.formatDate(new Date()),
                      Comments: oModelData.Comments,
                      TotalAmount: oModelData.TotalAmount,
                      Status:oModelData.Status === "Send back by account" ? "Send to account" : "Submitted",
                      ManagerRemark: oModelData.ManagerRemark,
                      AccountingRemark: oModelData.AccountingRemark,
                      FolderID: `https://workplace.zoho.in/#workdrive_app/home/63sop752ea6e63ddd4a8880466f5ae509b85a/privatespace/sharedwithme/allusers/${oModelData.FolderID}`,
                    },
                    filters: { ExpenseID: oModelData.ExpenseID },
                  };
                  that.ajaxUpdateWithJQuery("Expense", inboxData).then((oData) => {
                      if (oData) {
                        that.ViewModel.setProperty("/status", false);
                        that.byId("exp_Id_ExpenseTable").setMode(sap.m.ListMode.None);
                        dialog.close();
                        MessageToast.show(that.i18nModel.getText("expenseSubmittedStatus"));
                        BusyIndicator.hide();
                      }else{
                        MessageToast.show(this.i18nModel.getText("expenseSubmittedStatusFailed"));
                        BusyIndicator.hide();
                      }
                    })
                    .catch((oError) => {
                      dialog.close();
                      BusyIndicator.hide();
                      MessageToast.show(that.i18nModel.getText("commonErrorMessage"));
                    });
                } else {
                  MessageToast.show(
                    that.i18nModel.getText("checkboxUnselectedMessage")
                  );
                }
              },
            }),
            endButton: new sap.m.Button({
              text: "Cancel",
              press: function () {
                dialog.close();
              },
            }),
            afterClose: function () {
              dialog.destroy();
            },
          });
          dialog.open();
        },

        Exp_Frg_onChangeConverstionRate: function (oEvent) {
          var oModel = this.getView().getModel("ExpenseCreateModel");
          var oModelExpenseCreate = oModel.getData();
          if (oModelExpenseCreate.Currency !== "INR") {
            var oData = parseFloat(oModelExpenseCreate.ExpenseAmount) * parseFloat(oModelExpenseCreate.ConversionRate);
            oModel.setProperty("/TotalAmount", oData.toFixed(2));
          }
        },

        Exp_Det_onPressOpenFolder: function () {
          var oModel = this.getView().getModel("FilteredExpenseModel").getData()[0];
          var folderUrl = `https://workplace.zoho.in/#workdrive_app/home/63sop752ea6e63ddd4a8880466f5ae509b85a/privatespace/sharedwithme/allusers/${oModel.FolderID}`;
          window.open(folderUrl, "_blank");
        },

        Exp_Det_onPressNewFolder:async function(){
          var oData={
            "data": {
              FolderID:this.LoginModel.getProperty("/FolderID"),
              FolderName:`${this.FilteredExpenseModel[0].ExpenseName} ${this.FilteredExpenseModel[0].ExpStartDate} to ${this.FilteredExpenseModel[0].ExpEndDate}`,
              ExpenseID: this.ExpenseID
            }
          }
          try {
            const oCreateResponse = await this.ajaxCreateWithJQuery("NewFolder",oData);
            if (oCreateResponse) {
              MessageToast.show(this.i18nModel.getText("expenseFolderCreate"));   
              await this._fetchCommonData("Expense", "FilteredExpenseModel", { ExpenseID: this.ExpenseID });                   
            }
          } catch (oError) {
            BusyIndicator.hide();
            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
          }
        },

        onShowMore: function (oEvent) {
          var oBindingContext = oEvent.getSource().getBindingContext("ItemExpenseModel");
          var sFullText = oBindingContext.getObject().Comments;

          var formattedReferenceData = `
              <div style="padding: 15px; word-wrap: break-word; max-width: 100%; overflow-wrap: anywhere;">
                  <p>${sFullText}</p>
              </div>`;

          var oDialog = new sap.m.Dialog({
              title: this.getView().getModel("i18n").getProperty("comments"),
              draggable: true,
              resizable: true,
              contentWidth: "500px",
              contentHeight: "auto",
              content: new sap.ui.core.HTML({ content: formattedReferenceData }),
              beginButton: new sap.m.Button({
                  text: this.getView().getModel("i18n").getProperty("close"),
                  press: function () {oDialog.close()}
              })
          });
          oDialog.open();
      },

      AL_onShowEmployeeComments: function(oEvent) {
        var aData = this.getView().getModel("FilteredExpenseModel").getData();
        var oData = Array.isArray(aData) && aData.length > 0 ? aData[0] : {};
        var aComments = oData.comments || [];
     var aTimelineItems = aComments.map(function(oComment) {
         return new TimelineItem({
             dateTime: new Date(oComment.CommentDateTime).toLocaleString(),
             title: oComment.CommentedBy || "Anonymous",
             text: oComment.Comment || "No comment provided",
             userNameClickable: false,
             icon: "sap-icon://comment"
         });
     });
     var oTimeline = new Timeline({
         showHeader: false,
         enableBusyIndicator: false,
         width: "100%",
         sortOldestFirst: true,
         enableDoubleSided: false,
         content: aTimelineItems
     });
     var oDialog = new sap.m.Dialog({
         title: "Expense Comments",
         contentWidth: "25rem",
         contentHeight: "15rem",
         draggable: true,
         resizable: true,
         content: [oTimeline],
         endButton: new sap.m.Button({
             text: "Close",
             press: function() {
                 oDialog.close();
                 oDialog.destroy();
             }
         })
     });
     oDialog.open();
 },
      });
  });