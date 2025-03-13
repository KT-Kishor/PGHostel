sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem"

],
    function (BaseController, JSONModel, MessageToast, Filter, FilterOperator, MessagePopover, MessageItem) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.IdCard", {
            onInit: function () {
                this.getRouter().getRoute("RouteIDCardApplication").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                var that = this
                that.i18nModelMess = that.getView().getModel('i18n').getResourceBundle()
                var oTextModel = new JSONModel({ name: "" });
                that.getView().setModel(oTextModel, "TextDisplay");
                var oIdCardModel = that.getView().getModel("IdCardModel");
                if (oIdCardModel) {
                    oIdCardModel.attachPropertyChange(this.onPressDisplayImageOnCanvas.bind(this));
                }
            },
            onAfterRendering: function () {
              var canvasElement = document.getElementById('canvas');
              if (canvasElement) {
                  var context = canvasElement.getContext('2d');
                  if (context) {
                      context.clearRect(0, 0, canvasElement.width, canvasElement.height);
                  }
              }
          },
          // Function to open the ID card details dialog
          onPressIdCardDetails: function () {
              var oView = this.getView();
              this.onAfterRendering();
              // this.onFetchDetails();
              // this.FragmentDatePickersReadOnly(["DOB", "EmployeeID", "BloodGroup"])
              var idCardJson = {
                  EmployeeID: "",
                  EmployeeName: "",
                  BloodGroup: "",
                  DOB: "",
                  Designation: "",
                  MobileNo: "",
                  Email: "",
                  Attachment: "",
                  name: "",
                  mimeType: "",
                  Submit: true,
                  Save: false,
                  isEmployeedetails: true,
                  isEditable: true,
                  minDOB: new Date(2000, 0, 1),
                  today: new Date()
              };
              var oIdCardModel = new JSONModel(idCardJson);
              this.getView().setModel(oIdCardModel, "IdCardModel");
              this.openIdCardDialog(oView, true);
          },

          // Function to update ID card details
        //   onPressIdCardDetailsEdit: function () {
        //     var that = this;
        //     that.onAfterRendering();
        
        //     var oTable = this.byId("idCardTable"); // Get standard table instance
        //     var oSelectedItem = oTable.getSelectedItem(); // Get selected row
        
        //     if (!oSelectedItem) {
        //         sap.m.MessageBox.error(that.i18nModelMess.getText("idCardEditSelectRowMess"));
        //         return;
        //     }
        
        //     var oModelData = oSelectedItem.getBindingContext().getObject();
        //     this.oId = oModelData.EmployeeID;
        //     this.sPath = oSelectedItem.getBindingContext().getPath(); // Use getPath() instead of getObject("ID")
        
        //     var idCardJson = {
        //         EmployeeID: oModelData.EmployeeID,
        //         EmployeeName: oModelData.EmployeeName,
        //         BloodGroup: oModelData.BloodGroup,
        //         DOB: oModelData.DOB,
        //         Designation: oModelData.Designation,
        //         MobileNo: oModelData.MobileNo,
        //         Email: oModelData.Email,
        //         name: oModelData.name,
        //         mimeType: oModelData.mimeType,
        //         Attachment: oModelData.Attachment,
        //         minDOB: new Date(2000, 0, 1),
        //         today: new Date(),
        //         Submit: false,
        //         Save: true,
        //         isEditable: false,
        //     };
        
        //     var oIdCardModel = new sap.ui.model.json.JSONModel(idCardJson);
        //     this.getView().setModel(oIdCardModel, "IdCardModel");
        
        //     this.openIdCardDialog(this.getView(), false);
        // },
        
          // Open the ID card dialog fragment
          openIdCardDialog: function (oView, value) {
              this.getView().getModel("TextDisplay").setProperty("/name", "");
              if (!this.oDialog) {
                  sap.ui.core.Fragment.load({
                      name: "sap.kt.com.minihrsolution.fragment.AddIdCard",
                      controller: this
                  }).then(function (oDialog) {
                      this.oDialog = oDialog;
                      // this.FragmentDatePickersReadOnly(["idDateBirth"]);
                      oView.addDependent(this.oDialog);
                      this.oDialog.open();
                  }.bind(this));
              } else {
                  // this.FragmentDatePickersReadOnly(["idDateBirth"]);
                  this.oDialog.open();
              }
              if (value) {
                  sap.ui.getCore().byId("idGroupC").setSelectedIndex(0);
                  sap.ui.getCore().byId("comboBox").setSelectedKey("");
              } else {
                  if (this.oId.split("-").length === 1) {
                      sap.ui.getCore().byId("idGroupC").setSelectedIndex(0);
                  } else {
                      sap.ui.getCore().byId("idGroupC").setSelectedIndex(1);
                  }
              }
          },
              onPressClose: function () {
                this.oDialog.close();
              },
        
              onHandleUploadPress: function (oEvent) {
                var oFileUploader = oEvent.getSource();
                var oFile = oFileUploader.oFileUpload.files[0];
        
                if (!oFile) {
                  MessageToast.show("No file selected.");
                  return;
                }
        
                var validMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
                var validExtensions = ["jpg", "jpeg", "png"];
                var fileName = oFile.name.toLowerCase();
                var fileExtension = fileName.split(".").pop();
        
                if (
                  !validMimeTypes.includes(oFile.type) &&
                  !validExtensions.includes(fileExtension)
                ) {
                  MessageToast.show("Invalid file type.");
                  oFileUploader.clear();
                  return;
                }
        
                if (oFile.size > 5242880) {
                  // 5MB limit
                  MessageBox.error("File size exceeds the limit of 5Mb.");
                  oFileUploader.clear();
                  return;
                }
        
                var oReader = new FileReader();
                oReader.onload = function (e) {
                  var sFileBinary = e.target.result.split(",")[1];
                  var oModel = this.getView().getModel("IdCardModel");
        
                  if (oModel) {
                    oModel.setProperty("/Attachment", sFileBinary);
                    oModel.setProperty("/name", oFile.name);
                    oModel.setProperty("/mimeType", oFile.type);
                    this.onPressDisplayImageOnCanvas(sFileBinary, oFile.type);
                    this.getView()
                      .getModel("TextDisplay")
                      .setProperty("/name", oFile.name);
                  }
                  oFileUploader.clear();
                }.bind(this);
        
                oReader.readAsDataURL(oFile);
              },
              //open camera function
              onPressOpenCamera: function () {
                var oView = this.getView();
        
                if (!this.oCameraDialog) {
                  sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.Camera",
                    controller: this,
                  }).then(
                    function (oDialog) {
                      this.oCameraDialog = oDialog;
                      oView.addDependent(this.oCameraDialog);
                      this.oCameraDialog.attachAfterOpen(this._StartCamera.bind(this));
                      this.oCameraDialog.attachAfterClose(this._StopCamera.bind(this));
                      this.oCameraDialog.open();
                    }.bind(this)
                  );
                } else {
                  this.oCameraDialog.open();
                }
              },
        
              _StartCamera: function () {
                var oVideo = document.getElementById("video");
                if (!oVideo) {
                  return;
                }
        
                navigator.mediaDevices
                  .getUserMedia({ video: true })
                  .then(
                    function (stream) {
                      oVideo.srcObject = stream;
                      oVideo.play();
                      this._cameraStream = stream;
                    }.bind(this)
                  )
                  .catch(function (err) {
                    MessageToast.show("Camera access denied");
                  });
              },
        
              _StopCamera: function () {
                if (this._cameraStream) {
                  this._cameraStream.getTracks().forEach(function (track) {
                    track.stop();
                  });
                  this._cameraStream = null;
                }
        
                var oVideo = document.getElementById("video");
                if (oVideo) {
                  oVideo.srcObject = null;
                }
              },
        
              onCapturePress: function () {
                var oCanvas = document.getElementById("canvas");
                var oVideo = document.getElementById("video");
        
                if (
                  !oCanvas ||
                  !oVideo ||
                  oVideo.readyState < oVideo.HAVE_CURRENT_DATA
                ) {
                  return;
                }
        
                var oContext = oCanvas.getContext("2d", { willReadFrequently: true });
                if (!oContext) {
                  return;
                }
        
                oCanvas.width = oVideo.videoWidth;
                oCanvas.height = oVideo.videoHeight;
                oContext.drawImage(oVideo, 0, 0, oCanvas.width, oCanvas.height);
        
                var base64Image = oCanvas.toDataURL("image/png");
                var mimeType = base64Image.substring(5, base64Image.indexOf(";"));
                var imageName = "captured_image.png";
                base64Image = base64Image.replace("data:" + mimeType + ";base64,", "");
        
                var oModel = this.getView().getModel("IdCardModel");
        
                oModel.setProperty("/Attachment", base64Image);
                oModel.setProperty("/mimeType", mimeType);
                oModel.setProperty("/name", imageName);
                oModel.setProperty("/capturedImage", base64Image);
                oModel.setProperty("/capturedImageName", imageName);
        
                this.getView().getModel("TextDisplay").setProperty("/name", "");
                this._StopCamera();
                this.oCameraDialog.close();
              },
        
              onPressCloseCameraDialog: function () {
                this._StopCamera();
                if (this.oCameraDialog) {
                  this.oCameraDialog.close();
                }
              },
        
              onPressDisplayImageOnCanvas: function (sFileBinary, sFileType) {
                var canvas = document.getElementById("canvas");
                if (canvas) {
                  var context = canvas.getContext("2d");
                  var img = new Image();
                  img.onload = function () {
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.drawImage(img, 0, 0, canvas.width, canvas.height);
                  };
                  img.src = "data:" + sFileType + ";base64," + sFileBinary;
                }
              },
        });
    });