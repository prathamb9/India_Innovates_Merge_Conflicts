/**
 * CITY_NODES — Real named intersections / chowks for each supported city.
 * Each node: { id: string, name: string, pos: [lat, lng] }
 * Used by pickCorridorNodes() to select geographically relevant intersections
 * along a green corridor route.
 */

export const CITY_NODES = {

    Delhi: [
        { id: 'DWK', name: 'Dwarka Sector 12', pos: [28.5931, 77.0598] },
        { id: 'DWM', name: 'Dwarka Mor Chowk', pos: [28.5936, 77.0737] },
        { id: 'PVI', name: 'Palam Vihar Intersection', pos: [28.5889, 77.1005] },
        { id: 'IGI', name: 'IGI Airport T3', pos: [28.5562, 77.0999] },
        { id: 'DHK', name: 'Dhaula Kuan Flyover', pos: [28.5921, 77.1598] },
        { id: 'SVJ', name: 'Shankar Vihar Junction', pos: [28.5783, 77.1890] },
        { id: 'SAK', name: 'Saket District Centre', pos: [28.5244, 77.2167] },
        { id: 'AIM', name: 'AIIMS New Delhi', pos: [28.5672, 77.2100] },
        { id: 'CNG', name: 'Connaught Place', pos: [28.6315, 77.2167] },
        { id: 'RJP', name: 'Rajpath / India Gate', pos: [28.6129, 77.2295] },
        { id: 'NZM', name: 'Nizamuddin Station', pos: [28.5893, 77.2507] },
        { id: 'LPN', name: 'Lajpat Nagar', pos: [28.5700, 77.2373] },
        { id: 'NWD', name: 'Nehru Place', pos: [28.5484, 77.2517] },
        { id: 'KRB', name: 'Karol Bagh', pos: [28.6512, 77.1906] },
        { id: 'RHN', name: 'Rohini Sector 18', pos: [28.7421, 77.1034] },
        { id: 'GTK', name: 'GTK Road / Azadpur', pos: [28.7104, 77.1842] },
        { id: 'CSH', name: 'Civil Lines / ISBT', pos: [28.6804, 77.2255] },
        { id: 'PGM', name: 'Pragati Maidan', pos: [28.6188, 77.2435] },
        { id: 'GTB', name: 'GTB Hospital Northeast', pos: [28.6799, 77.3073] },
        { id: 'NDC', name: 'Narela Outer Ring', pos: [28.8450, 77.1034] },
        // ── Additional Delhi signals ──
        { id: 'ITO', name: 'ITO Intersection', pos: [28.6289, 77.2405] },
        { id: 'MLC', name: 'Moolchand Flyover', pos: [28.5688, 77.2346] },
        { id: 'MTB', name: 'Moti Bagh Intersection', pos: [28.5827, 77.1748] },
        { id: 'ASH', name: 'Ashram Chowk', pos: [28.5700, 77.2569] },
        { id: 'CRD', name: 'Chirag Delhi Signal', pos: [28.5394, 77.2194] },
        { id: 'JLN', name: 'JLN Stadium Signal', pos: [28.5863, 77.2366] },
        { id: 'PTN', name: 'Patel Nagar Signal', pos: [28.6448, 77.1710] },
        { id: 'DND', name: 'DND Toll Booth', pos: [28.5759, 77.2864] },
        { id: 'MYV', name: 'Mayur Vihar Phase 1', pos: [28.6037, 77.2975] },
        { id: 'WZB', name: 'Wazirabad Bridge', pos: [28.7188, 77.2270] },
        { id: 'PTP', name: 'Pitampura TV Tower', pos: [28.7072, 77.1376] },
        { id: 'PSV', name: 'Paschim Vihar Signal', pos: [28.6683, 77.1029] },
        { id: 'RJG', name: 'Rajouri Garden Signal', pos: [28.6498, 77.1208] },
        { id: 'MNK', name: 'Munirka Signal', pos: [28.5581, 77.1738] },
        { id: 'JNU', name: 'JNU / BRT Corridor', pos: [28.5392, 77.1672] },
        { id: 'VKJ', name: 'Vasant Kunj Signal', pos: [28.5197, 77.1601] },
        { id: 'RKP', name: 'RK Puram Sector 5', pos: [28.5734, 77.1886] },
        { id: 'GRP', name: 'Green Park Signal', pos: [28.5599, 77.2069] },
        { id: 'HKS', name: 'Hauz Khas Signal', pos: [28.5494, 77.2071] },
        { id: 'PSP', name: 'Panchsheel Park Signal', pos: [28.5369, 77.2182] },
    ],

    Mumbai: [
        { id: 'DDR', name: 'Dadar TT Circle', pos: [19.0210, 72.8427] },
        { id: 'HMT', name: 'Hindmata Junction', pos: [19.0178, 72.8339] },
        { id: 'SIO', name: 'Sion Circle', pos: [19.0442, 72.8632] },
        { id: 'MHM', name: 'Mahim Causeway', pos: [19.0395, 72.8406] },
        { id: 'BKC', name: 'Bandra-Kurla Complex', pos: [19.0654, 72.8672] },
        { id: 'AND', name: 'Andheri Junction', pos: [19.1136, 72.8697] },
        { id: 'GRG', name: 'Goregaon Flyover', pos: [19.1663, 72.8526] },
        { id: 'BOV', name: 'Borivali Junction', pos: [19.2289, 72.8567] },
        { id: 'KRL', name: 'Kurla West Junction', pos: [19.0724, 72.8796] },
        { id: 'DHV', name: 'Dharavi Junction', pos: [19.0491, 72.8553] },
        { id: 'GKP', name: 'Ghatkopar Flyover', pos: [19.0869, 72.9086] },
        { id: 'MLN', name: 'Mulund Naka', pos: [19.1777, 72.9568] },
        { id: 'THN', name: 'Thane Station Junction', pos: [19.1864, 72.9785] },
        { id: 'VSH', name: 'Vashi Junction', pos: [19.0771, 72.9988] },
        { id: 'NRL', name: 'Nerul Circle', pos: [19.0322, 73.0169] },
        { id: 'GPS', name: 'Ghatkopar-Panvel Signal', pos: [19.0790, 73.0124] },
        { id: 'CBS', name: 'CST / CST Junction', pos: [18.9398, 72.8355] },
        { id: 'CFF', name: 'Churchgate Flyover', pos: [18.9322, 72.8264] },
        // ── Additional Mumbai signals ──
        { id: 'WRL', name: 'Worli Naka Signal', pos: [19.0182, 72.8182] },
        { id: 'SCZ', name: 'Santacruz Junction', pos: [19.0824, 72.8420] },
        { id: 'JGS', name: 'Jogeshwari Flyover', pos: [19.1367, 72.8472] },
        { id: 'MLD', name: 'Malad Junction', pos: [19.1872, 72.8484] },
        { id: 'KDV', name: 'Kandivali Signal', pos: [19.2041, 72.8524] },
        { id: 'PWI', name: 'Powai Junction', pos: [19.1176, 72.9060] },
        { id: 'CMB', name: 'Chembur Signal', pos: [19.0622, 72.8969] },
        { id: 'WDL', name: 'Wadala Junction', pos: [19.0180, 72.8571] },
        { id: 'MTG', name: 'Matunga Circle', pos: [19.0258, 72.8530] },
        { id: 'PRL', name: 'Parel Signal', pos: [19.0072, 72.8425] },
        { id: 'LPR', name: 'Lower Parel Junction', pos: [18.9955, 72.8302] },
        { id: 'HJA', name: 'Haji Ali Signal', pos: [18.9827, 72.8128] },
        { id: 'NRM', name: 'Nariman Point Signal', pos: [18.9256, 72.8242] },
        { id: 'MRD', name: 'Marine Drive Flyover', pos: [18.9435, 72.8232] },
        { id: 'BYC', name: 'Byculla Junction', pos: [18.9780, 72.8333] },
    ],

    Bengaluru: [
        { id: 'SLK', name: 'Silk Board Junction', pos: [12.9176, 77.6234] },
        { id: 'HBL', name: 'Hebbal Flyover', pos: [13.0453, 77.5970] },
        { id: 'MRH', name: 'Marathahalli Bridge', pos: [12.9591, 77.6974] },
        { id: 'KRC', name: 'KR Circle', pos: [12.9784, 77.5943] },
        { id: 'MJS', name: 'Majestic Bus Stand', pos: [12.9771, 77.5713] },
        { id: 'SVJ', name: 'Shivajinagar Junction', pos: [12.9849, 77.6009] },
        { id: 'YSW', name: 'Yeshwantpur Junction', pos: [13.0246, 77.5477] },
        { id: 'NBH', name: 'Nagarbhavi Junction', pos: [12.9604, 77.5180] },
        { id: 'ECF', name: 'Electronic City Flyover', pos: [12.8458, 77.6620] },
        { id: 'SPR', name: 'Sarjapur Junction', pos: [12.9075, 77.6854] },
        { id: 'WHF', name: 'Whitefield Junction', pos: [12.9698, 77.7500] },
        { id: 'KRM', name: 'Koramangala 5th Block', pos: [12.9352, 77.6245] },
        { id: 'JLC', name: 'Jalahalli Cross', pos: [13.0529, 77.5518] },
        { id: 'RJN', name: 'Rajajinagar Cross', pos: [12.9884, 77.5523] },
        { id: 'DML', name: 'Domlur Flyover', pos: [12.9606, 77.6397] },
        { id: 'BNR', name: 'Bannerghatta Junction', pos: [12.9014, 77.5979] },
        { id: 'BLR', name: 'Bellandur Junction', pos: [12.9256, 77.6773] },
        // ── Additional Bengaluru signals ──
        { id: 'IDB', name: 'Indiranagar Double Road', pos: [12.9784, 77.6408] },
        { id: 'HLJ', name: 'HAL Airport Junction', pos: [12.9588, 77.6682] },
        { id: 'MGB', name: 'MG Road Brigade Signal', pos: [12.9754, 77.6058] },
        { id: 'LLB', name: 'Lalbagh West Gate', pos: [12.9507, 77.5846] },
        { id: 'JPN', name: 'JP Nagar Signal', pos: [12.9066, 77.5852] },
        { id: 'VSV', name: 'Vijayanagar Signal', pos: [12.9718, 77.5365] },
        { id: 'BNS', name: 'Banashankari Signal', pos: [12.9254, 77.5735] },
        { id: 'SDP', name: 'Sadashivanagar Signal', pos: [13.0074, 77.5818] },
        { id: 'MNR', name: 'Manyata Tech Park Gate', pos: [13.0470, 77.6218] },
        { id: 'ORC', name: 'ORR Iblur Junction', pos: [12.9141, 77.6475] },
        { id: 'BMF', name: 'Bommanahalli Flyover', pos: [12.9024, 77.6186] },
        { id: 'HSR', name: 'HSR Layout Signal', pos: [12.9121, 77.6446] },
    ],

    Hyderabad: [
        { id: 'HTC', name: 'Hitech City Junction', pos: [17.4474, 78.3762] },
        { id: 'JBH', name: 'Jubilee Hills Check Post', pos: [17.4307, 78.4082] },
        { id: 'BGP', name: 'Begumpet Flyover', pos: [17.4428, 78.4635] },
        { id: 'LKP', name: 'Lakdikapul Junction', pos: [17.4091, 78.4645] },
        { id: 'MPT', name: 'Mehdipatnam Circle', pos: [17.3952, 78.4341] },
        { id: 'AMP', name: 'Ameerpet Junction', pos: [17.4374, 78.4488] },
        { id: 'SCT', name: 'Secunderabad Clock Tower', pos: [17.4399, 78.4983] },
        { id: 'LBN', name: 'LB Nagar Junction', pos: [17.3439, 78.5519] },
        { id: 'DLN', name: 'Dilsukhnagar Circle', pos: [17.3686, 78.5240] },
        { id: 'KKP', name: 'Kukatpally Junction', pos: [17.4948, 78.3996] },
        { id: 'GCB', name: 'Gachibowli Circle', pos: [17.4400, 78.3489] },
        { id: 'TLC', name: 'Tolichowki Flyover', pos: [17.4052, 78.4231] },
        { id: 'MDP', name: 'Madhapur Junction', pos: [17.4487, 78.3909] },
        { id: 'KPB', name: 'KPHB Phase 1 Junction', pos: [17.4946, 78.3724] },
        { id: 'UPL', name: 'Uppal Junction', pos: [17.3987, 78.5593] },
        { id: 'BGD', name: 'Banjara Hills Road No. 12', pos: [17.4253, 78.4354] },
        { id: 'CHR', name: 'Charminar Circle', pos: [17.3616, 78.4747] },
        // ── Additional Hyderabad signals ──
        { id: 'PJG', name: 'Panjagutta Junction', pos: [17.4287, 78.4509] },
        { id: 'SMR', name: 'Shamshabad Airport Signal', pos: [17.2403, 78.4294] },
        { id: 'SRP', name: 'SR Nagar Signal', pos: [17.4403, 78.4407] },
        { id: 'RTC', name: 'RTC Cross Roads', pos: [17.4375, 78.4919] },
        { id: 'NMP', name: 'Nampally Station Signal', pos: [17.3935, 78.4720] },
        { id: 'MYP', name: 'Miyapur Junction', pos: [17.4956, 78.3534] },
        { id: 'BLR', name: 'Balanagar Junction', pos: [17.4738, 78.4452] },
        { id: 'KND', name: 'Kondapur Junction', pos: [17.4617, 78.3621] },
        { id: 'NKP', name: 'Nagole Junction', pos: [17.3766, 78.5537] },
        { id: 'MLK', name: 'Malkajgiri Signal', pos: [17.4553, 78.5229] },
    ],

    Chennai: [
        { id: 'ANS', name: 'Anna Salai Junction', pos: [13.0569, 80.2523] },
        { id: 'TNR', name: 'T. Nagar Pondy Bazaar', pos: [13.0418, 80.2341] },
        { id: 'VDP', name: 'Vadapalani Circle', pos: [13.0517, 80.2121] },
        { id: 'KYB', name: 'Koyambedu Hub', pos: [13.0698, 80.1964] },
        { id: 'PRR', name: 'Porur Junction', pos: [13.0363, 80.1591] },
        { id: 'TMB', name: 'Tambaram Circle', pos: [12.9229, 80.1272] },
        { id: 'GND', name: 'Guindy Junction', pos: [13.0068, 80.2206] },
        { id: 'TDP', name: 'Tidel Park Signal', pos: [12.9904, 80.2478] },
        { id: 'ADY', name: 'Adyar Signal', pos: [13.0067, 80.2574] },
        { id: 'BSN', name: 'Besant Nagar Circle', pos: [12.9990, 80.2674] },
        { id: 'VLC', name: 'Velachery Junction', pos: [12.9798, 80.2209] },
        { id: 'MDV', name: 'Medavakkam Junction', pos: [12.9279, 80.1986] },
        { id: 'OMR', name: 'OMR Toll Plaza', pos: [12.9526, 80.2286] },
        { id: 'PRB', name: 'Perambur Circle', pos: [13.1094, 80.2424] },
        { id: 'PLV', name: 'Pallavaram Circle', pos: [12.9675, 80.1508] },
        { id: 'EGM', name: 'Egmore Junction', pos: [13.0784, 80.2621] },
        { id: 'MBM', name: 'Mylapore Circle', pos: [13.0339, 80.2680] },
        // ── Additional Chennai signals ──
        { id: 'ASK', name: 'Ashok Nagar Signal', pos: [13.0380, 80.2123] },
        { id: 'NPR', name: 'Nungambakkam Signal', pos: [13.0616, 80.2382] },
        { id: 'THR', name: 'Thiruvanmiyur Signal', pos: [12.9837, 80.2610] },
        { id: 'CMM', name: 'Chromepet Junction', pos: [12.9512, 80.1402] },
        { id: 'TML', name: 'Teynampet Signal', pos: [13.0453, 80.2492] },
        { id: 'KNR', name: 'Kilpauk Signal', pos: [13.0867, 80.2417] },
        { id: 'AMB', name: 'Ambattur Signal', pos: [13.0985, 80.1622] },
        { id: 'AVD', name: 'Avadi Signal', pos: [13.1130, 80.1009] },
        { id: 'SHR', name: 'Sholinganallur Signal', pos: [12.9010, 80.2275] },
        { id: 'TBR', name: 'Thoraipakkam Signal', pos: [12.9333, 80.2338] },
    ],

    Pune: [
        { id: 'SHN', name: 'Shivajinagar Circle', pos: [18.5308, 73.8474] },
        { id: 'KTH', name: 'Kothrud Depot Junction', pos: [18.5085, 73.8071] },
        { id: 'HDP', name: 'Hadapsar Junction', pos: [18.5018, 73.9290] },
        { id: 'VNR', name: 'Viman Nagar Circle', pos: [18.5679, 73.9143] },
        { id: 'KTJ', name: 'Katraj Circle', pos: [18.4556, 73.8636] },
        { id: 'SWT', name: 'Swargate Bus Stand', pos: [18.5016, 73.8618] },
        { id: 'FCR', name: 'FC Road Junction', pos: [18.5238, 73.8403] },
        { id: 'DCN', name: 'Deccan Gymkhana', pos: [18.5178, 73.8404] },
        { id: 'PMP', name: 'Pimpri Circle', pos: [18.6279, 73.8006] },
        { id: 'CCW', name: 'Chinchwad Junction', pos: [18.6453, 73.7803] },
        { id: 'WKD', name: 'Wakad Circle', pos: [18.5979, 73.7616] },
        { id: 'BNR', name: 'Baner Junction', pos: [18.5605, 73.7879] },
        { id: 'AUN', name: 'Aundh Circle', pos: [18.5587, 73.8094] },
        { id: 'HJW', name: 'Hinjewadi Phase 1', pos: [18.5981, 73.7263] },
        { id: 'KHR', name: 'Kharadi Junction', pos: [18.5508, 73.9466] },
        { id: 'KNH', name: 'Kondhwa Junction', pos: [18.4700, 73.8935] },
        { id: 'MKT', name: 'Market Yard Junction', pos: [18.4960, 73.8622] },
        // ── Additional Pune signals ──
        { id: 'MGR', name: 'MG Road Camp Signal', pos: [18.5135, 73.8792] },
        { id: 'SNP', name: 'Senapati Bapat Road', pos: [18.5362, 73.8296] },
        { id: 'PVN', name: 'Pashan Signal', pos: [18.5336, 73.7890] },
        { id: 'BVD', name: 'Bavdhan Signal', pos: [18.5096, 73.7747] },
        { id: 'NDA', name: 'NDA Junction', pos: [18.4879, 73.7710] },
        { id: 'YRW', name: 'Yerwada Junction', pos: [18.5493, 73.8914] },
        { id: 'KLY', name: 'Kalyani Nagar Signal', pos: [18.5540, 73.9062] },
        { id: 'PMG', name: 'Pune Mundhwa Signal', pos: [18.5326, 73.9201] },
        { id: 'SBR', name: 'Salisbury Park Signal', pos: [18.4912, 73.8713] },
        { id: 'LHG', name: 'Law College Signal', pos: [18.5117, 73.8336] },
    ],

    Kolkata: [
        { id: 'ESP', name: 'Esplanade Crossing', pos: [22.5726, 88.3639] },
        { id: 'PRK', name: 'Park Street Junction', pos: [22.5514, 88.3519] },
        { id: 'GRH', name: 'Gariahat More', pos: [22.5191, 88.3668] },
        { id: 'RSB', name: 'Rashbehari More', pos: [22.5262, 88.3534] },
        { id: 'UTD', name: 'Ultadanga Junction', pos: [22.5757, 88.3880] },
        { id: 'DDM', name: 'Dum Dum Junction', pos: [22.6519, 88.3991] },
        { id: 'GRS', name: 'Garia Station Junction', pos: [22.4621, 88.3871] },
        { id: 'TLJ', name: 'Tala Junction', pos: [22.6092, 88.3766] },
        { id: 'BLG', name: 'Ballygunge Circle', pos: [22.5338, 88.3669] },
        { id: 'LKT', name: 'Lake Town Junction', pos: [22.6037, 88.4066] },
        { id: 'NWS', name: 'New Town Sector V', pos: [22.5767, 88.4633] },
        { id: 'BST', name: 'Barasat Junction', pos: [22.7235, 88.4776] },
        { id: 'BHL', name: 'Behala Crossing', pos: [22.4949, 88.3107] },
        { id: 'BGT', name: 'Baguiati Junction', pos: [22.6067, 88.4321] },
        { id: 'HWH', name: 'Howrah Station Junction', pos: [22.5833, 88.3417] },
        { id: 'SDR', name: 'Sealdah Junction', pos: [22.5657, 88.3760] },
        { id: 'DUM', name: 'Dumdum Cantonment', pos: [22.6364, 88.4031] },
        // ── Additional Kolkata signals ──
        { id: 'KSR', name: 'Kasba Signal', pos: [22.5142, 88.3912] },
        { id: 'JDV', name: 'Jadavpur Signal', pos: [22.4987, 88.3714] },
        { id: 'DHS', name: 'Dhakuria Signal', pos: [22.5085, 88.3623] },
        { id: 'TPG', name: 'Tollygunge Signal', pos: [22.4998, 88.3475] },
        { id: 'RBC', name: 'Ruby Crossing', pos: [22.5074, 88.3983] },
        { id: 'SLT', name: 'Salt Lake Stadium Signal', pos: [22.5682, 88.4147] },
        { id: 'MLP', name: 'Moulali Signal', pos: [22.5629, 88.3618] },
        { id: 'SYM', name: 'Shyambazar 5-Point', pos: [22.5935, 88.3720] },
        { id: 'BGH', name: 'Baghajatin Signal', pos: [22.4860, 88.3800] },
        { id: 'NPR', name: 'New Alipore Signal', pos: [22.5118, 88.3313] },
    ],

    Ahmedabad: [
        { id: 'NVR', name: 'Navrangpura Circle', pos: [23.0395, 72.5567] },
        { id: 'ISC', name: 'ISCON Circle', pos: [23.0294, 72.5062] },
        { id: 'PLD', name: 'Paldi Junction', pos: [23.0143, 72.5665] },
        { id: 'MNG', name: 'Maninagar Circle', pos: [22.9970, 72.6103] },
        { id: 'NRD', name: 'Naroda Junction', pos: [23.0806, 72.6464] },
        { id: 'VTV', name: 'Vatva Junction', pos: [22.9698, 72.6365] },
        { id: 'BPL', name: 'Bopal Circle', pos: [23.0277, 72.4730] },
        { id: 'SGH', name: 'SG Highway Junction', pos: [23.0344, 72.5101] },
        { id: 'STL', name: 'Satellite Circle', pos: [23.0277, 72.5131] },
        { id: 'VSP', name: 'Vastrapur Lake Junction', pos: [23.0369, 72.5270] },
        { id: 'GTC', name: 'Gota Circle', pos: [23.0785, 72.5424] },
        { id: 'CKD', name: 'Chandkheda Junction', pos: [23.1003, 72.5870] },
        { id: 'NKL', name: 'Nikol Circle', pos: [23.0439, 72.6483] },
        { id: 'VSL', name: 'Vastral Junction', pos: [23.0218, 72.6604] },
        { id: 'SRJ', name: 'Shivranjani Cross Roads', pos: [23.0217, 72.5329] },
        { id: 'AHM', name: 'Ahmedabad Junction (Old)', pos: [23.0230, 72.5984] },
        { id: 'CTV', name: 'Chandola Lake Junction', pos: [22.9993, 72.6265] },
        // ── Additional Ahmedabad signals ──
        { id: 'CGB', name: 'CG Road Signal', pos: [23.0320, 72.5588] },
        { id: 'JVR', name: 'Jamalpur Signal', pos: [23.0136, 72.5879] },
        { id: 'DRG', name: 'Drive-In Road Signal', pos: [23.0540, 72.5335] },
        { id: 'THL', name: 'Thaltej Signal', pos: [23.0495, 72.5005] },
        { id: 'PRH', name: 'Prahlad Nagar Signal', pos: [23.0130, 72.5116] },
        { id: 'GDN', name: 'Gandhinagar Highway Signal', pos: [23.0784, 72.5752] },
        { id: 'MLB', name: 'Memnagar Signal', pos: [23.0465, 72.5415] },
        { id: 'KKR', name: 'Kalupur Signal', pos: [23.0285, 72.6009] },
        { id: 'AMR', name: 'Ambawadi Signal', pos: [23.0310, 72.5498] },
        { id: 'SBM', name: 'Sabarmati Signal', pos: [23.0682, 72.5835] },
    ],
};

/**
 * Returns the array of nodes for a given city name.
 * Falls back to Delhi if city not found.
 */
export function getNodesForCity(cityName) {
    return CITY_NODES[cityName] || CITY_NODES['Delhi'];
}

// ─── Haversine distance (metres) between two lat/lng points ──────────────────
function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * nodesOnPolyline — Primary function for dynamic corridor node selection.
 *
 * Given the ACTUAL Google Maps route polyline (array of {lat, lng}), finds every
 * known city node that lies within `thresholdMeters` of any polyline vertex.
 * Results are ordered by their first-match position along the polyline (origin → dest).
 *
 * This gives the EXACT count of real signals on the shortest path — 0, 1, 4, 12...
 * whatever is actually there — instead of a hardcoded number.
 *
 * @param {Array<{lat: number, lng: number}>} polyline - Route polyline from Google Directions
 * @param {string} cityName - One of the supported city names
 * @param {number} thresholdMeters - Max distance from route for a node to be included (default 350)
 * @returns {Array<{id, name, pos}>} Ordered list of matching city nodes
 */
export function nodesOnPolyline(polyline, cityName, thresholdMeters = 350) {
    if (!polyline || polyline.length < 2) return [];
    const allNodes = getNodesForCity(cityName);

    // For each city node, find the closest polyline vertex
    const matched = [];
    for (const node of allNodes) {
        const [nLat, nLng] = node.pos;
        let minDist = Infinity;
        let bestPolyIdx = -1;
        for (let i = 0; i < polyline.length; i++) {
            const d = haversineMeters(nLat, nLng, polyline[i].lat, polyline[i].lng);
            if (d < minDist) { minDist = d; bestPolyIdx = i; }
        }
        if (minDist <= thresholdMeters) {
            matched.push({ node, polyIdx: bestPolyIdx, dist: minDist });
        }
    }

    // Sort by position along the polyline (closest vertex index → origin→dest order)
    matched.sort((a, b) => a.polyIdx - b.polyIdx);

    return matched.map(m => m.node);
}

/**
 * pickCorridorNodes — Fallback for when no polyline is available.
 * Uses a straight-line heuristic between origin and destination.
 * Prefer nodesOnPolyline() whenever the actual route polyline is available.
 *
 * Algorithm:
 * 1. Project every city node onto the O→D vector to get a scalar t (0=origin, 1=dest).
 * 2. Keep only nodes where 0 ≤ t ≤ 1 AND perpendicular distance ≤ MAX_PERP_DEG (~15 km).
 * 3. Return ALL such nodes in order (no artificial count cap).
 */
export function pickCorridorNodes(originLatLng, destLatLng, cityName, count = 5) {
    if (!originLatLng || !destLatLng) return [];
    const allNodes = getNodesForCity(cityName);

    const oLat = originLatLng.lat, oLng = originLatLng.lng;
    const dLat = destLatLng.lat,   dLng = destLatLng.lng;

    // Vector O→D
    const vLat = dLat - oLat;
    const vLng = dLng - oLng;
    const lenSq = vLat * vLat + vLng * vLng;

    // Maximum allowed perpendicular distance from the corridor line (in degrees).
    // 0.15° ≈ 15–16 km — wide enough for any city corridor.
    const MAX_PERP_DEG = 0.15;

    // Project each node onto the O→D line
    const candidates = [];
    for (const node of allNodes) {
        const nLat = node.pos[0], nLng = node.pos[1];

        // t = dot(N-O, D-O) / |D-O|²  →  projection scalar (0=O, 1=D)
        const t = lenSq > 0
            ? ((nLat - oLat) * vLat + (nLng - oLng) * vLng) / lenSq
            : 0;

        // Only keep nodes that lie between origin and destination
        if (t < 0 || t > 1) continue;

        // Perpendicular distance from the line
        const projLat = oLat + t * vLat;
        const projLng = oLng + t * vLng;
        const perpDist = Math.hypot(nLat - projLat, nLng - projLng);

        if (perpDist > MAX_PERP_DEG) continue;

        candidates.push({ node, t });
    }

    // Sort by position along the route (origin → destination)
    candidates.sort((a, b) => a.t - b.t);

    if (candidates.length === 0) return [];

    // Pick `count` evenly-spread nodes from the sorted candidate list
    const picked = [];
    const used = new Set();
    for (let i = 0; i < count; i++) {
        // Ideal t-position for the i-th node (spread evenly from 0 to 1)
        const idealT = (i + 1) / (count + 1);
        let best = null, bestDiff = Infinity;
        for (const c of candidates) {
            if (used.has(c.node.id)) continue;
            const diff = Math.abs(c.t - idealT);
            if (diff < bestDiff) { bestDiff = diff; best = c; }
        }
        if (best) { used.add(best.node.id); picked.push({ node: best.node, t: best.t }); }
    }

    // Re-sort picked nodes by t to guarantee origin→destination order in the output
    picked.sort((a, b) => a.t - b.t);

    return picked.map(p => p.node);
}
