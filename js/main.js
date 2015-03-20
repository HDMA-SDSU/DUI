
var app={
	gmap:null,
	tableID:{
		provider:'1qBvlmKMt_9vx6A0nts95ZLbTQE6gtIO9NYyc6jKl',
		fee:'1BJaFjSBV247xqMbWpGQyAsE4qC6Px8HAH7JPXb2c',
		update:'14RvFaXQoatlV2-EVutvmek5PSWtt-00rmMaHFhYp'//'1s4VLjbbYjCzu0Ys26HV3v_sHxdpW43aKZpnraxNG'
	},
	popup:new google.maps.InfoWindow(),
	markers:[],
	markerCluster:null,
	geocodingMarker:null,
	geocoder:new google.maps.Geocoder(),
	direction:new google.maps.DirectionsService(),
	directionRenderer:null,
	timeout:null,
	label:{
		fields:{
			"program_name":"Program Name",
			"cnty_code":"County Code",
			"cnty_desc":"County",
			"address_site":"Address (Site)",
			"address_mail":"Address (Mail)",
			"contact_person":"Contact Person",
			"contact_phone":"Phone",
			"contact_fax":"Fax",
			"contact_tfree":"Toll Free",
			"contact_website":"Website",
			"contact_email":"Email"
		},
		adminFees:{
			"ADSCRN":"Alcohol/Drug Screening", 
			"BADCK":"Bad Check", 
			"DUPDL":"Duplicate DL 101", 
			"LATPYM":"Late Payment", 
			"LOA":"Leave of Absence", 
			"MISACT":"Missed Activity",
			"REINST":"Reinstate",
			"RESCH":"Reschedule", 
			"XFERIN":"Transfer In", 
			"XFEROU":"Transfer Out",
			"OTHER":"Other"
		}
	}
	
}




$(function(){
	
	$.getScript("js/markerwithlabel.js", function(){
		//init ui
		init.ui()
		
		//init map
		init.map("gmap")
		
		//load all dui data
		/**
		run.detectLocation(function(position){
			if(position){
				var lat=position.coords.latitude,
					lng=position.coords.longitude;
				
				//show lat lng
				$("#header input[type='text']").val("Your Current Location: ("+lng+", "+lat+")")
				
				//spatial query
				run.spatialQuery(lat, lng);
			}else{
				run.query('select * from ' + app.tableID.update, function(json){
					run.showResult(json);
					
					
				});
			}
		});
		*/
		
		run.query('select * from ' + app.tableID.update, function(json){
			run.showResult(json);		
		});
				
	});
	
})



//init
var init={
	ui: function(){
		var $header=$("#header");
		
		//input 
		$header.find("input[type='text']").keyup(function(e){
			if(e.keyCode==13){
				run.search();
			}
		})
		
		
		//search dropdown menu
		$header.find(".dropdown-menu > li > a").click(function(){
			var $this=$(this),
				value=$this.attr("data-value"),
				placeHolder=$this.attr('data-placeHolder'),
				text=$this.text();
			
			//if value=all, make a default view to search by addresses
			if(value=='all'){value='address'; placeHolder='Input a location'; text='Search by Address';$header.find("input[type='text']").val("")}
			
			$header.find("input[type='text']").attr({"data-value": value, 'placeHolder': placeHolder});
			$header.find("#btn-search").text(text);
			
			run.search();
		});
		
		//search button
		$header.find("#btn-search").click(function(){
			run.search();
		});
		
		
		//filter
		$("#listFilter").keyup(function(){
            var rex = new RegExp($(this).val(), 'i'),
            	$target=$('#listResult li'),
            	$select;
            $target.hide();
            
            //filter list
            $select=$target.filter(function () {
                return rex.test($(this).text());
            }).show();
            
            //update number in hte badge
            $("#listContent > .badge").html($select.length);
            
            //update markers
            if(app.timeout){clearTimeout(app.timeout); app.timeout=null;}
            app.timeout=setTimeout(function(){
            	run.clearMarkers({clearResult:'false'});
            	var bounds=new google.maps.LatLngBounds()
            	
            	$select.each(function(){
            		var $this=$(this),
            			id=$this.attr('data-id'),
            			marker=app.markers[id];
            		
            		//marker.setMap(app.gmap);
            		app.markerCluster.addMarker(marker)
            		
            		bounds.extend(marker.getPosition())
            	})
            	app.gmap.fitBounds(bounds);
            }, 500)
		})
		
		
		
		
	},
	
	
	map: function(domID){
		//map
		app.gmap=new google.maps.Map(document.getElementById(domID), {
			center:{lat: 34.397, lng: -121.344},
			zoom:8,
			streetViewControl:true,
			panControl:false,
			zoomControlOptions:{style:google.maps.ZoomControlStyle.SMALL, position: google.maps.ControlPosition.RIGHT_BOTTOM}
		});
		
		//marker cluster
		app.markerCluster=new MarkerClusterer(app.gmap,null, {
			gridSize:30,
			maxZoom:13,
			imagePath:"images/m"
		});
	
	}
}


//run
var run={
	//search
	search: function(){
		//geocoding
		var $this=$("#header input[type='text']"), 
			value=$this.val(),
			type=$this.attr('data-value');
		
		//clear existing geocoding marker
		if(app.geocodingMarker){app.geocodingMarker.setMap(null); app.geocodingMarker=null;}
		if(app.directionRenderer){app.directionRenderer.setMap(null); }
		
		//clear filter
		$("#listFilter").val("");
		
		//show loading
		$("#header .loading").show();
		
		if(type&&type!=""){
			switch(type){
				case "address":
					if(value&&value!=''){
						run.geocoding(value, function(results, status){
							if(results&&results.length>0){
								//get first result
								var latlng=results[0].geometry.location;
								run.spatialQuery(latlng.lat(), latlng.lng())
							}
						})
					}else{
						//load all dui data
						run.query('select * from ' + app.tableID.update, function(json){
							run.showResult(json);
						});
					}
				break;
				case "name":
					if(value&&value!=""){
						run.query('select * from ' + app.tableID.update + " where program_name LIKE '%"+value+"%'", function(json){
							run.showResult(json)
						})
					}
				break;
				case "serviceType":
					
				break;
			}
					
		}	
		
		
	},
	
	
	
	//load dui data
	query: function(sql, callback){
		var url='https://www.googleapis.com/fusiontables/v2/query?',
			params={
				sql: sql,
				key:'AIzaSyAqd6BFSfKhHPiGaNUXnSt6jAzQ9q_3DyU'
			};
			
		if(sql&&sql!=""){
			url=url+$.map(params, function(v,k){return k+"="+encodeURIComponent(v)}).join("&")
			//console.log(url)
			$.getJSON(url, function(json){
				var output=null;
				
				if(json.columns&&json.rows&&json.columns.length>0&&json.rows.length>0){
					output=json
				}
				
				if(callback){callback(output)}
			})
			
		}
		
	},
	
	
	//spatial query
	spatialQuery: function(lat, lng, options){
		if(!lat || lat=='' || !lng || lng==''){console.log('[ERROR] run.spatailQuery: no lat or lng'); return;}
		
		//options
		if(!options){options={}}
		options.radius=options.radius || 50000; //unit: meter
		
		//show geocoding marker
		app.geocodingMarker=new google.maps.Marker({
			position:{lat:lat, lng:lng},
			map:app.gmap,
			icon:{
				url:"images/1420695267_Social_Media_Socialmedia_network_share_socialnetwork_network-14-128.png",
				//size:new google.maps.Size(35,35),
				scaledSize: new google.maps.Size(35,35)
			},
			title: "Your Location: "+ $("#header input[type='text']").val()
		});
		
		
		//query
		//var sql="select * from " + app.tableID.update +" where ST_INTERSECTS(lat, CIRCLE(LATLNG("+lat+","+lng+"),"+options.radius+"))";
		var sql="select * from " + app.tableID.update +" order by ST_DISTANCE(lat, LATLNG("+lat+","+lng+")) limit 10";
		run.query(sql, function(json){
			run.showResult(json);
		})
			
	},
	
	
	//clear all existing markers
	clearMarkers:function(options){
		//options
		if(!options){options={}}
		options.emptyMarkers=options.emptyMarkers || false;
		options.clearResult=options.clearResult || true;
		
	
		if(app.markers.length>0){
			app.markerCluster.clearMarkers();
			
			/**
			$.each(app.markers, function(i,m){
				m.setMap(null)
			}); 
			*/
			if(options.emptyMarkers){app.markers=[]}
			
		}
		
		
		
		//clear listContent
		if(options.clearResult!='false'){$("#listResult > ul").html("")}
		
	},
	
	
	//show result
	showResult: function(json, options){
		//options
		if(!options){options={}}
		options.fitBounds=options.fitBounds || true;
	
		if(json&&json.rows&&json.columns&&json.rows.length>0){
			var columns=json.columns,
				rows=json.rows,
				mapEvent=google.maps.event,
				marker=null,
				obj=null,
				$list=$("#listResult > ul"),
				latlngBounds=new google.maps.LatLngBounds();
			
			
			//clear all existing markers
			run.clearMarkers({emptyMarkers:true});
			

			//show Badge nad hide loading
			var $header=$("#header")
			$("#listContent .badge").html(rows.length).show();
			$header.find(".alert, .loading").hide();
			
			//enable filter
			$("#listFilter").removeAttr('disabled');
			
			//markers
			//json.markers=[]
			$.each(rows, function(i,values){
				obj=run.makeObj(columns, values)
				
				obj.serviceTypes=run.getServiceTypes(obj.all_programDescription)
				obj.fees=run.getFee(obj.all_Fee);
				obj.adminFees=run.getFee(obj.all_adminFee);
				
				//delete all fee
				delete obj.all_Fee
				delete obj.all_adminFee
				
				//marker=new google.maps.Marker({
				marker=new MarkerWithLabel({
					position: {lat: parseFloat(obj.lat), lng: parseFloat(obj.lng)},
					//map:app.gmap,
					title:obj.program_name,
					draggable:false,
					icon:{
						url:"images/symbol_blank.png",
						scaledSize:new google.maps.Size(30,30),
					},
					labelContent:i+1,
					labelAnchor: new google.maps.Point(10,25),
					labelClass: "mapIconLabel",
					labelInBackground:false
				})
				marker.dui={
					values:obj,
					contentHtml:run.makeContentHtml(obj)
				}
				
		
				//click event
				mapEvent.addListener(marker, 'click', function(e){
					var values=this.dui.values,
						serviceTypes=values.serviceTypes,
						contentHtml=this.dui.contentHtml;
					
					app.popup.setContent(contentHtml)
					app.popup.open(app.gmap, this);
				})
				
				//latlngbounds
				latlngBounds.extend(marker.getPosition())
				
				app.markerCluster.addMarker(marker)
				
				//show list
				$list.append("<li data-id="+i+">"+marker.dui.contentHtml+"<span class='badge num'>"+(i+1)+"</span><button class='edit'>edit</button></li>");	
			
			})
			
			//app.markers
			app.markers=app.markerCluster.getMarkers();
			
			
			//automatically zoom to markers bound
			if(options.fitBounds){app.gmap.fitBounds(latlngBounds)}
			
			//add a click event on each li in the contentList
			$list.find("> li").click(function(){
				var $this=$(this),
					id=$this.attr('data-id'),
					marker=app.markers[id];
				
				//sometimes marker cannot be shown on the map because marker.map is null
				//enforcely show marker ont
				if(!marker.map){marker.setMap(app.gmap)}
				
				app.gmap.setZoom(12);
				app.gmap.panTo(marker.position);
				google.maps.event.trigger(marker,'click')
			})
			
			//add a click event on edit button
			$list.find('button.edit').click(function(){
				var $this=$(this),
					$li=$this.parent(),
					id=$li.attr('data-id'),
					marker=app.markers[id];
				
				if(marker&&marker.dui){
					run.showPopup("edit", marker);
					
					$('#popup_edit button.updateData').attr('data-id', id);
				}
			})
			
		
		}else{
			//if no result
			//hide Badge
			$("#listContent .badge").html("").hide();
			$("#header .alert").show();
			
		}
			
	},
	
	
	//show popup
	showPopup: function(type, value){
		if(type){
			var $target;
			
			switch(type){
				case "edit":
					var $target=$('#popup_edit'),
						$body=$target.find('.modal-body').html(""),
						label=app.label.fields;
						
					
					if(value&&value.dui){
						var serviceTypes=value.dui.values.serviceTypes;
						
						$.each(value.dui.values, function(k,v){
							if(typeof(v)!="object"){
								if(label[k]){
									$body.append("<div class='input-group'><span class='input-group-addon'>"+label[k]+"</span><input type='text' class='form-control' placeholder='' value='"+v+"' data-key='"+k+"'/></div>");
								}
							}else{
								var html="<div class='input-group'><span class='input-group-addon'>"+k+"</span><div class='form-control'>"+
											(function(){
												var r="", l=app.label.adminFees,
													title, value;
												
												//adminFee
												if(k=='adminFees'){
													$.each(l, function(k1,vLabel){
														if(v[k1]){
															r+="<div class='input-group'><span class='input-group-addon subtitle'>"+vLabel+"</span><input type='text' class='form-control' placeholder='' value='"+v[k1]+"' data-key='"+k+"&"+k1+"'/></div>";
														}
													})
												}
												
												//fee
												if(k=='fees'){
													/**
													$.each(serviceTypes, function(k1,v1){
														if(v[v1]){
															r+="<div class='input-group'><span class='input-group-addon subtitle'>"+v1+"</span><input type='text' class='form-control' placeholder='' value='"+v[v1]+"' data-key='"+k+"-"+v1+"'/></div>";
														}
													})
													*/
													$.each(v, function(k1,v1){
														r+="<div class='input-group'><span class='input-group-addon subtitle'>"+k1+"</span><input type='text' class='form-control' placeholder='' value='"+v1+"' data-key='"+k+"&"+k1+"'/></div>";
													})
												}
												
												//service types
												
												
												return r
											})()
										 "</div></div>";
								$body.append(html)
							}
						});
					}
					
				break;
				case "login":
				
				
				
				break;
				case "confirmUpdate":
					$("#popup_edit").css('z-index', 1030);
					$target=$('#popup_confirmUpdate').modal('show').on('hidden.bs.modal', function(){
						$("#popup_edit").css('z-index', 1040);
					});
				break;	
			

			}
			
			if($target){
				$target.modal("show");
			}
			
		}
	},
	
	
	//show fee
	showFee:function(result, serviceTypes){
		//var html="<table><tr><td>Service Type</td><td>Fee</td></tr>";
		var html=""//"<b>Fee</b>";
							

		$.each(result, function(k,v){
			//html+="<tr "+((serviceTypes.indexOf(k)!=-1)?"class='highlight'":"")+"><td>"+k+"</td><td>$"+v+"</td></tr>";
			if(serviceTypes.indexOf(k)!=-1){
				//html+="<tr><td>"+k+"</td><td>$"+v+"</td></tr>";
				html+="<span>"+k+": <b>$ "+run.addComma(v)+"</b></span>";
			}
		})
		//html+="</table>";
							
		$(".contentHtml .fee").html(html)
	},
	
	
	//geocoding
	geocoding: function(address, callback){
		if(address&&address!=""){
			app.geocoder.geocode({
				address:address
				//region:
			}, function(results, status){
				var output=null;
				
				if(status=='OK'&&results&&results.length>0){
					output=results;
				}
				
				
				if(callback){
					callback(results,status)
				}
			});
			
		}
	},
	
	
	//generate html for popup window and list
	makeContentHtml: function(obj){
		var html="";

		if(obj){
			//console.log(obj)
			html="<div class='contentHtml'>"+
					  "<p class='type'>DUI for "+ obj.serviceTypes.join(" / ") +"</p>"+
					  "<h3 class='title'>"+
					  	((obj.contact_website!="")?("<a href='"+obj.contact_website+"' target='_blank'>"+obj.program_name+"</a>"):obj.program_name) +
					  	//((app.geocodingMarker)?("<div class='route'><a href='#' onclick='run.route("+obj.lat+", "+obj.lng+")'><img  src='images/1420698239_directions.png' title='get Direction' /></a></div>"):"")+
					  	((app.geocodingMarker)?("<button onclick='run.route("+obj.lat+", "+obj.lng+")'>Directions</button>"):"")+
					  "</h3>"+
					  ((obj.address_site!="")?("<span class='address_site'><b>Address: </b>"+obj.address_site+"</span>"):"")+
					  //((app.geocodingMarker)?("<span class='distance'>"+run.getDistance(obj.lat, obj.lng)+"</span>"):"")+
					  ((obj.contact_person!="")?("<span class='contact_person'><b>Contact:</b> "+obj.contact_person+"</span>"):"")+
					  ((obj.address_mail!="")?("<span class='address_mail'><b>Mail:</b> "+obj.address_mail+"</span>"):"")+
					  
					  ((obj.contact_phone!="")?("<span class='contact_phone'><b>Phone:</b> <a href='tel:"+obj.contact_phone+"'>"+run.formatPhone(obj.contact_phone)+"</a></span>"):"")+
					  ((obj.contact_fax!="")?("<span class='contact_fax'><b>Fax:</b> <a href='tel:"+obj.contact_fax+"'>"+run.formatPhone(obj.contact_fax)+"</a></span>"):"")+
					  ((obj.contact_tfree!="")?("<span class='contact_tfree'><b>Toll Free:</b> <a href='"+obj.contact_tfree+"'>"+run.formatPhone(obj.contact_tfree)+"</a></span>"):"")+
					  ((obj.contact_email!="")?("<span class='contact_email'><b>Email:</b> <a href='mailto:"+obj.contact_email+"'>"+obj.contact_email+"</a></span>"):"")+
					  ((obj.contact_website!="")?("<span class='contact_website'><b>Website:</b> <a href='"+obj.contact_website+"' target='_blank''>"+obj.contact_website+"</a></span>"):"")+
					  "<hr>"+
					  "<p class='fee' style='margin-top:5px; '>"+
					  	"<b class='subtitle'>Fee: </b><br>"+
					    (function(){
					    	var result='';
					    	$.each(obj.serviceTypes, function(i,k){
					    		result+="<span>"+k+": <b>$ "+run.addComma(obj.fees[k])+"</b></span>";
					    	})
					    	return result;
					    })()+
					  "</p>"+
					  "<p class='fee'>"+
					  	"<b class='subtitle'>Additional Program Fee: </b><br>"+
					    (function(){
					    	var result='', label=app.label.adminFees;
					    	$.each(label, function(k,v){
					    		if(obj.adminFees[k]){
					    			result+="<span>"+v+": <b>$ "+run.addComma(obj.adminFees[k])+"</b></span>";
					    		}
					    	})
					    	return result;
					    })()+
					  "</p>"+
					  
				  "</div>";
			
		}
		
		return html;
	},
	
	
	//get service type from string
	getServiceTypes: function(v){
		var types=[];
		$.each(v.split(" / "), function(i,k){
			if(types.indexOf(k)==-1){types.push(k)}
		})
		return types;
	},
	
	
	//make columns and rows as object
	makeObj: function(columns, rows){
		var obj={}; 
		$.each(columns, function(i,k){obj[k]=rows[i]}); 
		return obj
	},
	
	
	
	//get fee
	getFee: function(str_fee){
		if(!str_fee || str_fee==''){console.log('[ERROR] NO FEE: please check'); return;}
		
		var fees=str_fee.split(" / "),
			result={},
			temp;
		$.each(fees, function(i,f){
			temp=f.split(": ");
			
			result[temp[0]]=parseFloat(temp[1])
		})
		
		return result;
	},
	
	
	
	//add comma
	addComma: function(val){
		while (/(\d+)(\d{3})/.test(val.toString())){
			val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
		}
		return val;
	},
	
	
	formatPhone: function(num){
		num=String(num)
		num=num.slice(0, 5) + " " + num.slice(5,8)+"-"+num.slice(8);
		
		return num
	},
	
	
	//get eucliedean distance
	getDistance: function(lat1, lon1, options) {
		//options
		if(!options){options={}}
		options.unit=options.unit || 'mi';
		options.decimal=options.decimal || 1;
		
		var position=app.geocodingMarker.getPosition(),
			lat2=position.lat(),
			lon2=position.lng(),
			radlat1 = Math.PI * lat1/180,
			radlat2 = Math.PI * lat2/180,
			radlon1 = Math.PI * lon1/180,
			radlon2 = Math.PI * lon2/180,
			theta = lon1-lon2,
			radtheta = Math.PI * theta/180,
			dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
			
		dist = Math.acos(dist)
		dist = dist * 180/Math.PI
		dist = dist * 60 * 1.1515
		if (options.unit=="km") { dist = dist * 1.609344 }
		if (options.unit=="mi") { dist = dist * 0.8684 }
		return dist.toFixed(options.decimal) + " " + options.unit
	} ,
	
	
	//route
	route:function(lat,lng){
		if(!lat||!lng){console.log("[ERROR] run.route: no input lat or lng"); return;}
		if(!app.geocodingMarker){console.log("[ERROR] run.route: no app.geocodingMarker"); return; }
		
		//clear existing route
		if(app.directionRenderer){app.directionRenderer.setMap(null)}
		
		
		//start routing
		app.direction.route({
			origin: app.geocodingMarker.getPosition(),
			destination: new google.maps.LatLng(lat,lng),
			travelMode: google.maps.TravelMode.DRIVING,
			unitSystem: google.maps.UnitSystem.IMPERIAL
		}, function(result, status){
			if(status=='OK'){
				if(result.routes&&result.routes.length>0){
					
					app.directionRenderer=new google.maps.DirectionsRenderer({
						directions: result,
						map:app.gmap,
						suppressMarkers:true
					})
					
					
					/**
					var route=result.routes[0];
					app.route=new google.maps.Polyline({
						path:route.overview_path,
						map:app.gmap,
						strokeColor:"#CC1A48",
						strokeOpacity:0.7, 
						strokeWeight:5,
						directionResult:route
					})
					
					//app.gmap.fitBounds(route.bounds)
					
					google.maps.event.addListener(app.route, "click", function(){
						console.log(this)
					})
					*/
				}
			}
		});
	},
	
	
	//get user's ip location
	detectLocation:function(callback){
		if(navigator.geolocation) {
        	navigator.geolocation.getCurrentPosition(function(position){
        		if(callback){callback(position)}
        	});
       }else{
       		if(callback){callback()}
       }
	},
	
	
	
	//update data
	updateData: function(){
		var $target=$('#popup_edit'),
			id=$target.find('button.updateData').attr('data-id'),
			marker=app.markers[id],
			data;
			
		if(!marker){console.log('[ERROR] run.updateData: cannot find marker'); return; }
		
		if(marker&&marker.dui&&marker.dui.values){
			data=$.extend({}, marker.dui.values);
		}
		
		if(data){
			//get values from input form
			$('#popup_edit input').each(function(){
				var $this=$(this),
					keys=$this.attr('data-key').split('&');
				
				if(keys.length>1){
					data[keys[0]][keys[1]]=$this.val();
				}else{
					data[keys[0]]=$this.val();
				}
			})
			
			//copy fees and adminFess to all_Fee and all_adminFee
			data["all_Fee"]=data["fees"]
			data["all_adminFee"]=data["adminFees"]
			
			delete data["fees"]
			delete data["adminFees"]
		
			
			//create request values
			var rows=[], lic_nbr=data.lic_lic_cert_nbr, outputs;
			$.each(data, function(k,v){
				if(typeof(v)=="object"){
					outputs=[];
					$.each(v, function(k1,v1){
						outputs.push(k1+": "+v1);
					})
					
					rows.push(k+"==="+outputs.join(' / '))
				}else{
					rows.push(k+"==="+v)
				}
			})
			
			console.log(rows, lic_nbr)

		}
		
		//show loading
		var $confirm=$("#popup_confirmUpdate");
		$confirm.find(".loading").show();
		
		//send back to update
		$.ajax({
			type:"POST",
			url:"ws/updateTable.py",
			dataType:"json",
			data:{
				lic_nbr:lic_nbr,
				rows:rows.join('|')
			},
			success: function(json){
				console.log(json)
				//if update successfully
				if(json&&json.response&&json.response.kind=='fusiontables#sqlresponse'&&json.response.columns.length==1&&json.response.columns[0]=='affected_rows'){
					alert('updateData: succeed!!!');
					
					
					$('#popup_edit, #popup_confirmUpdate').modal('hide');	
				}else{
					$confirm.find(".modal-body").append("<div class='error'>[ERROR] updateData:" + (function(){$.each(json, function(k,v){return k+": "+v})})()+"</div>");
				}
				
				$confirm.find(".loading").hide();
			},
			error: function(){
				$confirm.find(".modal-body").append("<div class='error'>[ERROR] cannot post the request to server!</div>");
				$confirm.find(".loading").hide();
			}
			
		})
		
	
		
	}
	
}
